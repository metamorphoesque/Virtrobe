// src/dev/DevRouter.jsx
// Intercepts /dev/* paths for local preview without auth.
// Import once in App.jsx:
//   import DevRouter from './dev/DevRouter';
//   function App() {
//     const devPage = DevRouter();
//     if (devPage) return devPage;
//     ...
//   }

import React from 'react';
import ProfilePage   from '../components/pages/ProfilePage';
import MoodboardPage from '../components/pages/MoodboardPage';
import AuthPage      from '../components/pages/AuthPage';

// A fake currentUser that makes ProfilePage think we're logged in
// (ProfilePage uses mock data internally for now, so this is just for the guard check)
const MOCK_CURRENT_USER = {
  id:    'dev-preview-user',
  email: 'preview@virtrobe.com',
  user_metadata: { display_name: 'Alex Kim' },
};

const DevRouter = () => {
  const path = window.location.pathname;
  if (!path.startsWith('/dev')) return null;

  // ── /dev  index ──────────────────────────────────────────────────────────
  if (path === '/dev' || path === '/dev/') {
    return (
      <div style={{ fontFamily: 'monospace', padding: '2.5rem', background: '#fafafa', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.4rem' }}>🛠 Dev Routes</h1>
        <p style={{ color: '#777', marginBottom: '2rem', fontSize: '0.82rem' }}>
          Preview pages without signing in. These routes only exist locally.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {[
            ['/dev/profile',        'Profile page — mock data, no Supabase'],
            ['/dev/profile-empty',  'Profile page — signed-out state'],
            ['/dev/moodboard',      'Moodboard feed — reads real Supabase public submissions'],
            ['/dev/auth',           'Auth page — fullscreen login/signup'],
          ].map(([route, desc]) => (
            <a key={route} href={route} style={{ display: 'flex', gap: '1.5rem', alignItems: 'baseline', textDecoration: 'none' }}>
              <code style={{ color: '#000', fontWeight: 700, minWidth: '220px', fontSize: '0.85rem' }}>{route}</code>
              <span style={{ color: '#555', fontSize: '0.8rem' }}>{desc}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // ── /dev/profile ─────────────────────────────────────────────────────────
  // ProfilePage has mock data baked in — just pass a mock currentUser
  // so the signed-out guard doesn't show the sign-in prompt.
  if (path === '/dev/profile') {
    return (
      <div style={{ background: '#fff', minHeight: '100vh', paddingTop: '2rem' }}>
        {/* Minimal nav chrome so the page looks right in context */}
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 300 }}>Virtrobe</span>
            <span style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>dev/profile preview</span>
          </div>
          <ProfilePage
            currentUser={MOCK_CURRENT_USER}
            onOpenAuth={() => alert('Auth modal would open here')}
          />
        </div>
      </div>
    );
  }

  // ── /dev/profile-empty ───────────────────────────────────────────────────
  if (path === '/dev/profile-empty') {
    return (
      <div style={{ background: '#fff', minHeight: '100vh', paddingTop: '2rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <ProfilePage
            currentUser={null}
            onOpenAuth={() => alert('Auth modal would open here')}
          />
        </div>
      </div>
    );
  }

  // ── /dev/moodboard ───────────────────────────────────────────────────────
  if (path === '/dev/moodboard') {
    return (
      <div style={{ background: '#fff', minHeight: '100vh', padding: '2rem 1.5rem' }}>
        <MoodboardPage currentUser={null} />
      </div>
    );
  }

  // ── /dev/auth ────────────────────────────────────────────────────────────
  if (path === '/dev/auth') {
    return (
      <AuthPage
        onAuthSuccess={(u) => {
          console.log('Auth success:', u);
          window.location.href = '/dev';
        }}
      />
    );
  }

  // ── Unknown /dev/* route ─────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2>404 — unknown dev route</h2>
      <p style={{ marginTop: '0.5rem' }}>
        <a href="/dev" style={{ color: '#000' }}>← Back to dev index</a>
      </p>
    </div>
  );
};

export default DevRouter;