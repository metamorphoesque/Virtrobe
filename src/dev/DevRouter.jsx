// src/dev/DevRouter.jsx
// ═══════════════════════════════════════════════════════════════════
//  SECURE DEV ROUTER
//
//  Intercepts /dev/* paths for local preview with secure auth.
//  Requires DEV_ACCESS_KEY authentication before showing any pages.
//  Completely disabled in production builds (VITE_DEV_MODE !== 'true').
//
//  Import once in App.jsx:
//    import DevRouter from './dev/DevRouter';
//    function App() {
//      const devPage = DevRouter();
//      if (devPage) return devPage;
//      ...
//    }
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import ProfilePage from '../components/pages/ProfilePage';
import MoodboardPage from '../components/pages/MoodboardPage';
import AuthPage from '../components/pages/AuthPage';
import TryOnPage from '../components/pages/TryOnPage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Session key for sessionStorage
const DEV_TOKEN_KEY = 'vt_dev_token';
const DEV_USER_KEY = 'vt_dev_user';

// ─────────────────────────────────────────────────────────────────────
// Dev API helpers — attach x-dev-token header to all requests
// ─────────────────────────────────────────────────────────────────────
function getDevToken() {
  return sessionStorage.getItem(DEV_TOKEN_KEY);
}

function getDevUser() {
  try {
    return JSON.parse(sessionStorage.getItem(DEV_USER_KEY));
  } catch {
    return null;
  }
}

function clearDevSession() {
  sessionStorage.removeItem(DEV_TOKEN_KEY);
  sessionStorage.removeItem(DEV_USER_KEY);
}

async function devLogin(key) {
  const res = await fetch(`${API_URL}/api/dev/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Invalid dev access key');
  }

  const { token, user } = await res.json();
  sessionStorage.setItem(DEV_TOKEN_KEY, token);
  sessionStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
  return { token, user };
}

async function devLogout() {
  const token = getDevToken();
  if (token) {
    // Best-effort server notification
    fetch(`${API_URL}/api/dev/logout`, {
      method: 'POST',
      headers: { 'x-dev-token': token },
    }).catch(() => { });
  }
  clearDevSession();
}

// ─────────────────────────────────────────────────────────────────────
// Password Gate — shown when not authenticated
// ─────────────────────────────────────────────────────────────────────
const PasswordGate = ({ onAuthenticated }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await devLogin(key.trim());
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      padding: '2rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>🔐</span>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Dev Access</h1>
          </div>
          <p style={{ color: '#888', fontSize: '0.78rem', margin: 0 }}>
            Enter your dev access key to preview pages.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="DEV_ACCESS_KEY"
            autoFocus
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.7rem 0.9rem',
              border: `1px solid ${error ? '#e53e3e' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
              background: loading ? '#f5f5f5' : '#fff',
            }}
          />

          {error && (
            <p style={{
              color: '#e53e3e',
              fontSize: '0.75rem',
              marginTop: '0.5rem',
              marginBottom: 0,
            }}>
              ✕ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.7rem',
              background: loading ? '#666' : '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'monospace',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Verifying…' : 'Sign in to dev'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: '#bbb',
          fontSize: '0.68rem',
          marginTop: '1.5rem',
          marginBottom: 0,
        }}>
          These routes are only available in development.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Dev Chrome — wraps preview pages with sign-out header
// ─────────────────────────────────────────────────────────────────────
const DevChrome = ({ user, onSignOut, children }) => (
  <div style={{ minHeight: '100vh', background: '#fff' }}>
    {/* Dev header bar */}
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 999,
      background: '#1a1a1a',
      color: '#fff',
      padding: '0.5rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'monospace',
      fontSize: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>🔧 <strong>DEV MODE</strong></span>
        <a href="/dev" style={{ color: '#aaa', textDecoration: 'none' }}>← Index</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: '#888' }}>{user?.email}</span>
        <button
          onClick={onSignOut}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontFamily: 'monospace',
            transition: 'background 0.2s',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Main DevRouter
// ─────────────────────────────────────────────────────────────────────
const DevRouter = () => {
  const path = window.location.pathname;

  // Only activate on /dev paths
  if (!path.startsWith('/dev')) return null;

  // Block in production
  if (!DEV_MODE) {
    return (
      <div style={{ padding: '3rem', fontFamily: 'monospace', textAlign: 'center' }}>
        <h2>🚫 Dev routes are disabled</h2>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>
          Set <code>VITE_DEV_MODE=true</code> in your .env to enable.
        </p>
      </div>
    );
  }

  // State
  const [user, setUser] = useState(() => getDevUser());
  const [authenticated, setAuthenticated] = useState(() => !!getDevToken());

  const handleAuthenticated = useCallback((devUser) => {
    setUser(devUser);
    setAuthenticated(true);
  }, []);

  const handleSignOut = useCallback(() => {
    devLogout();
    setUser(null);
    setAuthenticated(false);
  }, []);

  // Not authenticated — show password gate
  if (!authenticated) {
    return <PasswordGate onAuthenticated={handleAuthenticated} />;
  }

  // Build mock user object for page props
  const mockCurrentUser = {
    id: user?.id || 'dev-00000000-0000-0000-0000-000000000001',
    email: user?.email || 'dev@virtrobe.local',
    user_metadata: { display_name: 'Dev User' },
  };

  // ── /dev — Authenticated index ─────────────────────────────────────
  if (path === '/dev' || path === '/dev/') {
    const routes = [
      ['/dev/profile', 'Profile page — mock data, dev auth token'],
      ['/dev/profile-empty', 'Profile page — signed-out state'],
      ['/dev/moodboard', 'Moodboard feed — reads real Supabase public submissions'],
      ['/dev/tryon', 'Try-On page — 3D mannequin + garment fitting'],
      ['/dev/auth', 'Auth page — fullscreen login/signup'],
    ];

    return (
      <DevChrome user={user} onSignOut={handleSignOut}>
        <div style={{ fontFamily: 'monospace', padding: '2.5rem', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.3rem' }}>🛠 Dev Routes</h1>
          <p style={{ color: '#888', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
            Signed in as <strong>{user?.email}</strong>. Token attached to all API requests.
          </p>
          <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '0.72rem' }}>
            These routes exist only in development mode.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {routes.map(([route, desc]) => (
              <a
                key={route}
                href={route}
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'baseline',
                  textDecoration: 'none',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  transition: 'background 0.15s',
                  background: 'transparent',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <code style={{ color: '#000', fontWeight: 700, minWidth: '200px', fontSize: '0.82rem' }}>{route}</code>
                <span style={{ color: '#666', fontSize: '0.78rem' }}>{desc}</span>
              </a>
            ))}
          </div>
        </div>
      </DevChrome>
    );
  }

  // ── /dev/profile ───────────────────────────────────────────────────
  if (path === '/dev/profile') {
    return (
      <DevChrome user={user} onSignOut={handleSignOut}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <ProfilePage
            currentUser={mockCurrentUser}
            onOpenAuth={() => alert('Auth modal would open here')}
          />
        </div>
      </DevChrome>
    );
  }

  // ── /dev/profile-empty ─────────────────────────────────────────────
  if (path === '/dev/profile-empty') {
    return (
      <DevChrome user={user} onSignOut={handleSignOut}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <ProfilePage
            currentUser={null}
            onOpenAuth={() => alert('Auth modal would open here')}
          />
        </div>
      </DevChrome>
    );
  }

  // ── /dev/moodboard ─────────────────────────────────────────────────
  if (path === '/dev/moodboard') {
    return (
      <DevChrome user={user} onSignOut={handleSignOut}>
        <div style={{ padding: '2rem 1.5rem' }}>
          <MoodboardPage currentUser={mockCurrentUser} />
        </div>
      </DevChrome>
    );
  }

  // ── /dev/tryon ─────────────────────────────────────────────────────
  if (path === '/dev/tryon') {
    return (
      <DevChrome user={user} onSignOut={handleSignOut}>
        <TryOnPage
          user={mockCurrentUser}
          userGender="female"
          onUserChange={() => { }}
          onOpenAuth={() => alert('Auth modal would open here')}
        />
      </DevChrome>
    );
  }

  // ── /dev/auth ──────────────────────────────────────────────────────
  if (path === '/dev/auth') {
    return (
      <DevChrome user={user} onSignOut={handleSignOut}>
        <AuthPage
          onAuthSuccess={(u) => {
            console.log('Auth success:', u);
            window.location.href = '/dev';
          }}
        />
      </DevChrome>
    );
  }

  // ── Unknown /dev/* route ───────────────────────────────────────────
  return (
    <DevChrome user={user} onSignOut={handleSignOut}>
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h2>404 — unknown dev route</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <a href="/dev" style={{ color: '#000' }}>← Back to dev index</a>
        </p>
      </div>
    </DevChrome>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Export the dev token getter so other services can attach it to requests
// ─────────────────────────────────────────────────────────────────────
export { getDevToken };
export default DevRouter;