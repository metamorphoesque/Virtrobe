// server/middleware/devAuth.js
// ═══════════════════════════════════════════════════════════════════
//  DEV AUTH MIDDLEWARE
//
//  Provides a secure development-only authentication layer.
//  Uses HMAC-signed tokens gated behind a DEV_ACCESS_KEY env var.
//  Completely disabled in production.
// ═══════════════════════════════════════════════════════════════════

const crypto = require('crypto');

const DEV_ACCESS_KEY = process.env.DEV_ACCESS_KEY;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Deterministic dev user — always the same ID for consistency
const DEV_USER = {
    id: 'dev-00000000-0000-0000-0000-000000000001',
    email: 'dev@virtrobe.local',
    role: 'authenticated',
    isDev: true,
};

/**
 * Check if dev auth is available in this environment.
 */
function isDevAuthEnabled() {
    if (process.env.NODE_ENV === 'production') return false;
    if (!DEV_ACCESS_KEY || DEV_ACCESS_KEY.length < 8) return false;
    return true;
}

/**
 * Sign a dev token payload with HMAC-SHA256.
 */
function signToken(payload) {
    const data = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', DEV_ACCESS_KEY)
        .update(data)
        .digest('hex');
    // Base64-encode the payload + signature
    const token = Buffer.from(JSON.stringify({ data, signature })).toString('base64');
    return token;
}

/**
 * Verify and decode a dev token.
 * Returns the payload if valid, null if invalid/expired.
 */
function verifyToken(token) {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        const { data, signature } = decoded;

        // Verify HMAC
        const expected = crypto
            .createHmac('sha256', DEV_ACCESS_KEY)
            .update(data)
            .digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
            return null;
        }

        const payload = JSON.parse(data);

        // Check expiry
        if (payload.exp && Date.now() > payload.exp) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Create a new signed dev token.
 */
function createDevToken() {
    return signToken({
        userId: DEV_USER.id,
        email: DEV_USER.email,
        iat: Date.now(),
        exp: Date.now() + TOKEN_TTL_MS,
    });
}

/**
 * Middleware: check for x-dev-token header.
 * If present and valid, attaches req.user with the dev user.
 * If not present, falls through (does not reject).
 *
 * Place this BEFORE requireAuth in the middleware chain.
 */
const devTokenMiddleware = (req, res, next) => {
    if (!isDevAuthEnabled()) return next();

    const devToken = req.headers['x-dev-token'];
    if (!devToken) return next();

    const payload = verifyToken(devToken);
    if (!payload) return next(); // invalid token — let normal auth handle it

    // Attach synthetic dev user
    req.user = { ...DEV_USER };
    req.isDevAuth = true;

    next();
};

module.exports = {
    isDevAuthEnabled,
    createDevToken,
    verifyToken,
    devTokenMiddleware,
    DEV_USER,
};
