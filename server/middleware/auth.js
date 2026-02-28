// server/middleware/auth.js
// ═══════════════════════════════════════════════════════════════════
//  JWT AUTHENTICATION MIDDLEWARE
//
//  Verifies the Supabase JWT from the Authorization header.
//  Attaches req.user with the authenticated user's data.
// ═══════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

// Create a server-side Supabase client using the service role key
// This can verify tokens without needing the user's session
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Use service role key if available, fall back to anon key for token verification
const serverSupabase = createClient(
    supabaseUrl || '',
    supabaseServiceKey || supabaseAnonKey || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Middleware that requires a valid Supabase JWT in the Authorization header.
 * Use on routes that modify data or access user-specific resources.
 *
 * Usage:
 *   router.post('/protected-route', requireAuth, handler);
 */
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please include a valid Bearer token in the Authorization header',
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token || token.length < 10) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        // Verify the JWT with Supabase
        const { data: { user }, error } = await serverSupabase.auth.getUser(token);

        if (error || !user) {
            console.warn('🔒 Auth failed:', error?.message || 'No user returned');
            return res.status(401).json({
                error: 'Invalid or expired token',
                message: error?.message || 'Token verification failed',
            });
        }

        // Attach user to request object for downstream handlers
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (err) {
        console.error('🔒 Auth middleware error:', err);
        return res.status(500).json({ error: 'Authentication service error' });
    }
};

/**
 * Optional auth middleware — doesn't reject unauthenticated requests,
 * but attaches req.user if a valid token is present.
 * Use on routes that work for both authenticated and anonymous users.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token && token.length >= 10) {
                const { data: { user } } = await serverSupabase.auth.getUser(token);
                if (user) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                    };
                }
            }
        }
    } catch (_) {
        // Silently continue — optional auth should never block
    }
    next();
};

module.exports = { requireAuth, optionalAuth };
