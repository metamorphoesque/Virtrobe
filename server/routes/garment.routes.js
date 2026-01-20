// server/routes/garment.routes.js
import express from 'express';
import upload from '../middleware/upload.js';
import * as garmentController from '../controllers/garment.controller.js';

const router = express.Router();

// POST /api/garment/generate - Generate 3D garment from image
router.post(
  '/generate',
  upload.single('image'), // Expects 'image' field in multipart form
  garmentController.generateGarment
);

// GET /api/garment/health - Health check
router.get('/health', garmentController.healthCheck);

export default router;