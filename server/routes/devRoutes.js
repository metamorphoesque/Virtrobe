// server/routes/devRoutes.js
// ═══════════════════════════════════════════════════════════════════
//  DEV AUTH ROUTES
//
//  POST /api/dev/login   — validate DEV_ACCESS_KEY, return signed token
//  POST /api/dev/logout  — no-op (stateless), client clears token
//  GET  /api/dev/status  — check if dev auth is enabled
//
//  All routes are completely disabled in production.
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const {
    isDevAuthEnabled,
    createDevToken,
    DEV_USER,
} = require('../middleware/devAuth');

const DEV_ACCESS_KEY = process.env.DEV_ACCESS_KEY;

// ── Guard: block everything in production ────────────────────────────
router.use((req, res, next) => {
    if (!isDevAuthEnabled()) {
        return res.status(403).json({
            error: 'Dev routes are disabled',
            reason: process.env.NODE_ENV === 'production'
                ? 'Not available in production'
                : 'DEV_ACCESS_KEY not configured',
        });
    }
    next();
});

/**
 * GET /api/dev/status
 * Public check — is dev auth available?
 */
router.get('/status', (req, res) => {
    res.json({
        enabled: true,
        environment: process.env.NODE_ENV || 'development',
    });
});

/**
 * POST /api/dev/login
 * Body: { key: "the DEV_ACCESS_KEY value" }
 * Returns: { token, user }
 */
router.post('/login', (req, res) => {
    const { key } = req.body;

    if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'Missing key in request body' });
    }

    // Constant-time comparison to prevent timing attacks
    const keyBuffer = Buffer.from(key);
    const expectedBuffer = Buffer.from(DEV_ACCESS_KEY);

    if (keyBuffer.length !== expectedBuffer.length) {
        return res.status(401).json({ error: 'Invalid dev access key' });
    }

    const crypto = require('crypto');
    if (!crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
        return res.status(401).json({ error: 'Invalid dev access key' });
    }

    // Key is valid — issue a signed token
    const token = createDevToken();

    res.json({
        token,
        user: {
            id: DEV_USER.id,
            email: DEV_USER.email,
            role: DEV_USER.role,
            isDev: true,
        },
    });
});

/**
 * POST /api/dev/logout
 * Stateless — just acknowledges. Client is responsible for clearing the token.
 */
router.post('/logout', (req, res) => {
    res.json({ message: 'Dev session cleared' });
});

module.exports = router;
