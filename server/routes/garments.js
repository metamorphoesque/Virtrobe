// server/routes/garments.js
// REST API endpoints for garment generation with Hugging Face TripoSR
// 🔒 Mutation routes require authentication via Supabase JWT

const express = require('express');
const router = express.Router();
const tripoService = require('../services/tripoService');
const garmentCache = require('../models/garmentCache');
const upload = require('../middleware/upload');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { generateCacheKey } = require('../utils/imageHash');

// ── Input Validation ──────────────────────────────────────────────────
const ALLOWED_GARMENT_TYPES = new Set([
  'tshirt', 'shirt', 'jacket', 'dress', 'tanktop',
  'pants', 'skirt', 'shorts', 'trousers', 'jeans',
  'leggings', 'hoodie', 'sweater', 'coat', 'unknown',
]);

function validateGarmentType(type) {
  if (!type) return 'unknown';
  const normalized = type.toLowerCase().trim();
  return ALLOWED_GARMENT_TYPES.has(normalized) ? normalized : 'unknown';
}

// ── Generation rate limiter (applied per-route) ───────────────────────
// Import from app.locals or create inline
const rateLimit = require('express-rate-limit');
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation rate limit reached. Please wait a minute.' },
});

/**
 * POST /api/garments/generate-sync
 * 🔒 Requires authentication
 * Generate 3D model from uploaded garment image with real-time progress
 */
router.post('/generate-sync',
  requireAuth,
  generateLimiter,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const imagePath = req.file.path;
      const options = {
        garment_type: validateGarmentType(req.body.garment_type),
      };

      // Generate cache key
      const cacheKey = await generateCacheKey(imagePath, options);

      // Check cache first
      const cached = await garmentCache.get(cacheKey);
      if (cached) {
        return res.json({
          cached: true,
          garment: {
            taskId: cached.task_id,
            modelUrl: `/models/${cached.task_id}.glb`,
            thumbnailUrl: cached.thumbnail_url,
            garmentType: cached.garment_type,
            creditsUsed: 0,
            service: 'cache'
          }
        });
      }

      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        // Check service availability first
        const availability = await tripoService.checkAvailability();

        if (!availability.available && availability.status === 'loading') {
          sendProgress({
            type: 'info',
            message: `Model is warming up. This will take ~${availability.estimatedTime}s...`,
            status: 'MODEL_LOADING'
          });
        }

        // Generate with progress updates
        const result = await tripoService.generateGarmentModel(
          imagePath,
          options,
          (progress) => {
            sendProgress({
              type: 'progress',
              ...progress
            });
          }
        );

        // Cache the result
        await garmentCache.save({
          cacheKey,
          taskId: result.taskId,
          modelPath: result.modelPath,
          thumbnailUrl: null,
          originalFilename: req.file.originalname,
          garmentType: options.garment_type,
          generationOptions: options,
          creditsUsed: 0,
          userId: req.user?.id || null,
        });

        // Send completion
        sendProgress({
          type: 'complete',
          garment: {
            taskId: result.taskId,
            modelUrl: result.modelUrl,
            garmentType: options.garment_type,
            creditsUsed: 0,
            service: 'huggingface-triposr',
            free: true
          }
        });

        res.end();
      } catch (error) {
        console.error('Generation error:', error);
        sendProgress({
          type: 'error',
          error: error.message
        });
        res.end();
      }

    } catch (error) {
      console.error('Sync generation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/garments/generate
 * 🔒 Requires authentication
 * Quick generation endpoint (non-streaming)
 */
router.post('/generate',
  requireAuth,
  generateLimiter,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const imagePath = req.file.path;
      const options = {
        garment_type: validateGarmentType(req.body.garment_type),
      };

      // Generate cache key
      const cacheKey = await generateCacheKey(imagePath, options);

      // Check cache
      const cached = await garmentCache.get(cacheKey);
      if (cached) {
        return res.json({
          cached: true,
          garment: {
            taskId: cached.task_id,
            modelUrl: `/models/${cached.task_id}.glb`,
            garmentType: cached.garment_type,
            creditsUsed: 0
          }
        });
      }

      // Generate
      const result = await tripoService.generateGarmentModel(imagePath, options);

      // Cache
      await garmentCache.save({
        cacheKey,
        taskId: result.taskId,
        modelPath: result.modelPath,
        thumbnailUrl: null,
        originalFilename: req.file.originalname,
        garmentType: options.garment_type,
        generationOptions: options,
        creditsUsed: 0,
        userId: req.user?.id || null,
      });

      res.json({
        cached: false,
        garment: {
          taskId: result.taskId,
          modelUrl: result.modelUrl,
          garmentType: options.garment_type,
          creditsUsed: 0,
          service: 'huggingface-triposr',
          free: true
        }
      });

    } catch (error) {
      console.error('Generation error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/garments/cache/:cacheKey
 * Public — cached garment lookup
 */
router.get('/cache/:cacheKey', async (req, res) => {
  try {
    const { cacheKey } = req.params;

    // Basic input validation
    if (!cacheKey || cacheKey.length > 128) {
      return res.status(400).json({ error: 'Invalid cache key' });
    }

    const garment = await garmentCache.get(cacheKey);

    if (!garment) {
      return res.status(404).json({ error: 'Garment not found in cache' });
    }

    res.json({
      taskId: garment.task_id,
      modelUrl: `/models/${garment.task_id}.glb`,
      thumbnailUrl: garment.thumbnail_url,
      garmentType: garment.garment_type,
      createdAt: garment.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/garments/list
 * Public — list cached garments
 */
router.get('/list', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200); // clamp 1–200
    const garments = await garmentCache.getAll(limit);

    res.json({
      count: garments.length,
      garments: garments.map(g => ({
        taskId: g.task_id,
        modelUrl: `/models/${g.task_id}.glb`,
        thumbnailUrl: g.thumbnail_url,
        garmentType: g.garment_type,
        originalFilename: g.original_filename,
        createdAt: g.created_at,
        accessCount: g.accessed_count
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/garments/stats
 * Public — cache statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await garmentCache.getStats();
    const rateLimitInfo = await tripoService.getRateLimitInfo();

    res.json({
      cache: stats,
      service: {
        name: 'Hugging Face TripoSR',
        cost: 'FREE',
        ...rateLimitInfo
      },
      totalSavings: 'Infinite (all generations are free!)'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/garments/cleanup
 * 🔒 Requires authentication (admin operation)
 */
router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    const deletedCount = await garmentCache.cleanExpired();
    res.json({
      message: `Cleaned up ${deletedCount} expired garments`,
      deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/garments/availability
 * Public — check if the service is ready
 */
router.get('/availability', async (req, res) => {
  try {
    const availability = await tripoService.checkAvailability();
    res.json(availability);
  } catch (error) {
    res.status(500).json({
      available: false,
      error: error.message
    });
  }
});

module.exports = router;