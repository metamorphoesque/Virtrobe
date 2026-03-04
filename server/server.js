// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const garmentRoutes = require('./routes/garments');
const devRoutes = require('./routes/devRoutes');
const { devTokenMiddleware } = require('./middleware/devAuth');
const outfitsRouter = require('./routes/outfits');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,                        // ← disabled for dev (Three.js/WebGL needs this)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-token'],
}));

// ── Rate Limiting ─────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation rate limit reached. Please wait a minute.' },
});

app.use('/api/', generalLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Dev Auth Middleware ───────────────────────────────────────────────
app.use(devTokenMiddleware);
app.use('/api/outfits', outfitsRouter);

// ── Static Files ──────────────────────────────────────────────────────
app.use('/models', express.static(path.join(__dirname, 'generatedModels')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/dev', devRoutes);
app.use('/api/garments', garmentRoutes);

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Virtrobe API',
    provider: 'Hugging Face TripoSR',
    cost: 'FREE',
    timestamp: new Date().toISOString(),
    huggingface_token: !!process.env.HUGGINGFACE_TOKEN,
    supabase_configured: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
  });
});

// ── Global error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(500).json({ error: message });
});

app.locals.generateLimiter = generateLimiter;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🎨  Virtrobe Backend  |  FREE 3D  🎨   ║
╚══════════════════════════════════════════╝

  URL:      http://localhost:${PORT}
  Service:  Hugging Face TripoSR
  Cost:     FREE
  Token:    ${process.env.HUGGINGFACE_TOKEN ? '✅ Configured (fast mode)' : '⚠️  Not set (slower - works fine though)'}
  Auth:     ${process.env.SUPABASE_URL ? '✅ Supabase configured' : '⚠️  Not configured (routes unprotected)'}
  Dev Auth: ${process.env.DEV_ACCESS_KEY && process.env.NODE_ENV !== 'production' ? '✅ DEV_ACCESS_KEY set' : '⚠️  Disabled'}

  Endpoints:
  → GET  /api/health
  → POST /api/garments/generate-sync   🔒 Auth required
  → POST /api/garments/generate        🔒 Auth required
  → GET  /api/garments/availability    (public)
  → GET  /api/garments/list            (public)
  → POST /api/dev/login                🔧 Dev only
  → POST /api/dev/logout               🔧 Dev only

  ${!process.env.HUGGINGFACE_TOKEN
      ? '💡 Get a FREE token for 2x speed:\n     https://huggingface.co/settings/tokens'
      : ''}
  🚀 Ready!
  `);
});

module.exports = app;