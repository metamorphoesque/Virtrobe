// server/routes/garments.js
// REST API endpoints for garment generation with Hugging Face TripoSR

const express = require('express');
const router = express.Router();
const tripoService = require('../services/tripoService');
const garmentCache = require('../models/garmentCache');
const upload = require('../middleware/upload');
const { generateCacheKey } = require('../utils/imageHash');

/**
 * POST /api/garments/generate-sync
 * Generate 3D model from uploaded garment image with real-time progress
 */
router.post('/generate-sync', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const options = {
      garment_type: req.body.garment_type || 'unknown'
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
        thumbnailUrl: null, // TripoSR doesn't provide thumbnails
        originalFilename: req.file.originalname,
        garmentType: options.garment_type,
        generationOptions: options,
        creditsUsed: 0 // Free!
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
});

/**
 * POST /api/garments/generate
 * Quick generation endpoint (non-streaming)
 */
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const options = {
      garment_type: req.body.garment_type || 'unknown'
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
      creditsUsed: 0
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
});

/**
 * GET /api/garments/cache/:cacheKey
 * Get cached garment by cache key
 */
router.get('/cache/:cacheKey', async (req, res) => {
  try {
    const { cacheKey } = req.params;
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
 * List all cached garments
 */
router.get('/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
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
 * Get cache statistics
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
 * Clean expired cache entries
 */
router.post('/cleanup', async (req, res) => {
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
 * Check if the service is ready
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