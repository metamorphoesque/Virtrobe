// server/server.js
// Main Express server for Virtrobe with FREE Hugging Face TripoSR

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const garmentRoutes = require('./routes/garments-triposr');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static model files
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/garments', garmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Virtrobe API (FREE)',
    timestamp: new Date().toISOString(),
    huggingface_token: !!process.env.HUGGINGFACE_TOKEN,
    provider: 'Hugging Face TripoSR',
    cost: 'FREE'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║       Virtrobe API Server (FREE)       ║
╚════════════════════════════════════════╝

  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Service: Hugging Face TripoSR
  Cost: FREE (no API key required!)
  ${process.env.HUGGINGFACE_TOKEN ? '✓ Token configured (better rate limits)' : '⚠ No token (still works, just slower)'}
  
  Endpoints:
  → GET  /api/health
  → POST /api/garments/generate
  → POST /api/garments/generate-sync
  → GET  /api/garments/availability
  → GET  /api/garments/list
  → GET  /api/garments/stats
  
  🎉 Ready to generate FREE 3D garments! 🎉
  ${!process.env.HUGGINGFACE_TOKEN ? '\n  💡 Tip: Add HUGGINGFACE_TOKEN to .env for faster generation\n     Get free token at: https://huggingface.co/settings/tokens' : ''}
  `);
});

module.exports = app;