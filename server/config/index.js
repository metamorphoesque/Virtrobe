// server/config/index.js
import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Modal.com API
  modalApiKey: process.env.MODAL_API_KEY || '',
  modalEndpoint: process.env.MODAL_ENDPOINT || '',
  
  // CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // File Upload
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Timeouts
  modalTimeout: 120000, // 2 minutes
};

export default config;