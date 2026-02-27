// src/dev/DevRouter.jsx
// Drop-in dev router — intercepts /dev/* paths and renders pages with mock data.
// Import once at the top of App.jsx:
//
//   import DevRouter from './dev/DevRouter';
//   ...
//   function App() {
//     const devPage = DevRouter();          // ← add this as first line of App()
//     if (devPage) return devPage;          // ← and this
//     ...rest of app
//   }
//
// Only active on /dev/* paths — production is completely unaffected.

import React from 'react';
import ProfilePage   from '../components/pages/ProfilePage';
import MoodboardPage from '../components/pages/MoodboardPage';
import AuthPage      from '../components/pages/AuthPage';

// ---------------------------------------------------------------------------
// Mock data — realistic enough to see all UI states
// ---------------------------------------------------------------------------
const MOCK_USER = {
  id:    'mock-user-preview',
  email: 'preview@virtrobe.com',
  user_metadata: { display_name: 'Alex Kim' },
};

const MOCK_PROFILE = {
  id:           'mock-user-preview',
  display_name: 'Alex Kim',
  username:     'alexkim',
  bio:          'Minimalist dresser. Tokyo → London. Always in monochrome.',
  location:     'London, UK',
  website_url:  'https://alexkim.co',
  avatar_url:   null,
  created_at:   '2024-09-01T00:00:00Z',
};

// 14 mock outfits spread across the last 30 days — no real screenshots
const MOCK_OUTFITS = Array.from({ length: 14 }, (_, i) => ({
  id:                  `mock-outfit-${i}`,
  name:                ['Autumn Edit', 'Office Minimal', 'Weekend Layers', 'Studio Look',
                        'Evening Black', 'Sunday Casual', 'Sharp Tailoring', 'Relaxed Linen',
                        'Night Out', 'Gallery Opening', 'Cafe Morning', 'Commute Fit',
                        'Travel Light', 'Monochrome Day'][i],
  screenshotSignedUrl: null,   // no image → shows placeholder silhouette
  saved_at:            new Date(Date.now() - i * 86400000 * 2.1).toISOString(),
  is_public:           i % 3 === 0,
  tags:                [['minimal'], ['autumn', 'office'], ['casual'], ['evening']][i % 4],
  description:         'A curated look for the season.',
}));

// ---------------------------------------------------------------------------
// Hijack useProfile for mock rendering without Supabase
// ---------------------------------------------------------------------------
const MockProfilePage = () => {
  // Inline mock — avoids needing jest or any test library
  const [profile, setProfile]   = React.useState(MOCK_PROFILE);
  const [outfits, setOutfits]   = React.useState(MOCK_OUTFITS);
  const [saving,  setSaving]    = React.useState(false);
  const [error]                 = React.useState(null);

  // Simulate updateProfile
  const updateProfile = async (fields) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800)); // fake latency
    setProfile((p) => ({ ...p, ...fields }));
    setSaving(false);
  };

  const deleteOutfit        = (id) => setOutfits((prev) => prev.filter((o) => o.id !== id));
  const toggleOutfitPublic  = (id, val) => setOutfits((prev) => prev.map((o) => o.id === id ? { ...o, is_public: val } : o));
  const uploadAvatar        = async () => {};
  const removeAvatar        = async () => setProfile((p) => ({ ...p, avatar_url: null }));

  // Temporarily override useProfile by passing props directly through a wrapper
  return (
    <ProfilePageMocked
      currentUser={MOCK_USER}
      profile={profile}
      outfits={outfits}
      loading={false}
      saving={saving}
      error={error}
      updateProfile={updateProfile}
      uploadAvatar={uploadAvatar}
      removeAvatar={removeAvatar}
      deleteOutfit={deleteOutfit}
      toggleOutfitVisibility={toggleOutfitPublic}
      onOpenAuth={() => alert('Auth modal would open here')}
    />
  );
};

// Re-export ProfilePage with injected mock hook via context
// (Since ProfilePage calls useProfile internally, we pass props via a provider pattern)
import { createContext, useContext } from 'react';

export const MockProfileContext = createContext(null);

// Wrapper that ProfilePage reads from if context exists
export const useMockableProfile = (userId) => {
  const mock = useContext(MockProfileContext);
  if (mock) return mock;
  // Fall through to real hook when not in mock context
  const { useProfile } = require('../hooks/useProfile');
  return useProfile(userId);
};

const ProfilePageMocked = ({ currentUser, onOpenAuth, ...mockData }) => (
  <MockProfileContext.Provider value={mockData}>
    <ProfilePage currentUser={currentUser} onOpenAuth={onOpenAuth} />
  </MockProfileContext.Provider>
);

// ---------------------------------------------------------------------------
// DevRouter — call this as a function at the top of App()
// Returns a React element if on a /dev/* path, null otherwise.
// ---------------------------------------------------------------------------
const DevRouter = () => {
  const path = window.location.pathname;

  if (!path.startsWith('/dev/') && path !== '/dev') return null;

  // Dev index — shows all available routes
  if (path === '/dev' || path === '/dev/') {
    return (
      <div style={{ fontFamily: 'monospace', padding: '2rem', background: '#fafafa', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '0.5rem' }}>🛠 Dev Routes</h1>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.85rem' }}>
          Preview pages without logging in. These routes only exist locally.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[
            ['/dev/profile',       'Profile page — with mock data (no Supabase)'],
            ['/dev/profile-empty', 'Profile page — signed-out state'],
            ['/dev/profile-real',  'Profile page — real Supabase (needs valid user UUID in code)'],
            ['/dev/moodboard',     'Moodboard page — fetches real public feed from Supabase'],
            ['/dev/auth',          'Auth page — fullscreen login/signup'],
          ].map(([route, desc]) => (
            <a key={route} href={route} style={{ display: 'flex', gap: '1.5rem', alignItems: 'baseline', textDecoration: 'none' }}>
              <code style={{ color: '#000', fontWeight: 700, minWidth: '220px' }}>{route}</code>
              <span style={{ color: '#555', fontSize: '0.82rem' }}>{desc}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (path === '/dev/profile')       return <MockProfilePage />;
  if (path === '/dev/profile-empty') return <ProfilePage currentUser={null} onOpenAuth={() => alert('Auth would open')} />;

  if (path === '/dev/profile-real') {
    // Replace this UUID with any real user from your Supabase auth.users table
    const realUser = { id: 'REPLACE_WITH_REAL_UUID', email: 'test@virtrobe.com' };
    return <ProfilePage currentUser={realUser} onOpenAuth={() => {}} />;
  }

  if (path === '/dev/moodboard') return <MoodboardPage currentUser={null} />;
  if (path === '/dev/auth')      return <AuthPage onAuthSuccess={(u) => { console.log('auth', u); window.location.href = '/dev'; }} />;

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2>404 — unknown dev route</h2>
      <a href="/dev">← Back to dev index</a>
    </div>
  );
};

export default DevRouter; 