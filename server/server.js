// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const garmentRoutes = require('./routes/garments');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve generated GLB models as static files
app.use('/models', express.static(path.join(__dirname, 'generatedModels')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/garments', garmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Virtrobe API',
    provider: 'Hugging Face TripoSR',
    cost: 'FREE',
    timestamp: new Date().toISOString(),
    huggingface_token: !!process.env.HUGGINGFACE_TOKEN
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🎨  Virtrobe Backend  |  FREE 3D  🎨   ║
╚══════════════════════════════════════════╝

  URL:      http://localhost:${PORT}
  Service:  Hugging Face TripoSR
  Cost:     FREE
  Token:    ${process.env.HUGGINGFACE_TOKEN ? '✅ Configured (fast mode)' : '⚠️  Not set (slower - works fine though)'}

  Endpoints:
  → GET  /api/health
  → POST /api/garments/generate-sync
  → GET  /api/garments/availability
  → GET  /api/garments/list

  ${!process.env.HUGGINGFACE_TOKEN
    ? '💡 Get a FREE token for 2x speed:\n     https://huggingface.co/settings/tokens'
    : ''}
  🚀 Ready!
  `);
});

module.exports = app;