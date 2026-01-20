// server/controllers/garment.controller.js
import modalClient from '../services/modalClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * POST /api/garment/generate
 * Convert uploaded image to 3D garment
 */
export const generateGarment = asyncHandler(async (req, res) => {
  // Validate image file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file provided'
    });
  }

  console.log('📥 Received garment generation request');
  console.log('   File:', req.file.originalname);
  console.log('   Size:', req.file.size, 'bytes');
  console.log('   Type:', req.file.mimetype);

  // Extract options from request body
  const options = {
    garmentType: req.body.garmentType,
    measurements: req.body.measurements ? JSON.parse(req.body.measurements) : null
  };

  console.log('   Options:', options);

  // Call Modal API
  const glbBuffer = await modalClient.imageToGLB(req.file.buffer, options);

  // Return GLB file
  res.set({
    'Content-Type': 'model/gltf-binary',
    'Content-Disposition': 'attachment; filename="garment.glb"',
    'Content-Length': glbBuffer.length
  });

  res.send(glbBuffer);
  
  console.log(' Sent GLB file to client');
});

/**
 * GET /api/garment/health
 * Check if Modal service is available
 */
export const healthCheck = asyncHandler(async (req, res) => {
  const isHealthy = await modalClient.healthCheck();
  
  res.json({
    success: true,
    modal: isHealthy ? 'online' : 'offline',
    server: 'online'
  });
});