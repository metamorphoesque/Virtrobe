// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Search, User, Grid3x3, Sparkles, BookOpen, LogIn, LogOut, ChevronDown } from 'lucide-react';

import HomePage      from './components/pages/HomePage';
import SearchPage    from './components/pages/SearchPage';
import TryOnPage     from './components/pages/TryOnPage';
import MoodboardPage from './components/pages/MoodboardPage';
import AdminPage     from './components/pages/AdminPage';
import AuthPage      from './components/pages/AuthPage';
import authService   from './services/authService';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

// ============================================
// BRAND LOGO
// ============================================
const BrandLogo = ({ onClick }) => {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const cycle = () => {
      setExpanded(false);
      setTimeout(() => setExpanded(true), 2500);
      setTimeout(() => setExpanded(false), 5500);
    };
    cycle();
    const id = setInterval(cycle, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <button onClick={onClick} className="relative h-12 flex items-center justify-center overflow-hidden w-72 flex-shrink-0">
      <div className="relative flex items-center justify-center">
        {[
          { t: 'Virt',     s: { left: 'calc(50% - 56px)' },  c: expanded ? 'opacity-0 -translate-x-10' : 'opacity-100 translate-x-0' },
          { t: 'Virtual',  s: { left: 'calc(50% - 132px)' }, c: expanded ? 'opacity-100 translate-x-0'  : 'opacity-0 translate-x-10' },
          { t: 'robe',     s: { right: 'calc(50% - 56px)' }, c: expanded ? 'opacity-0 translate-x-10'   : 'opacity-100 translate-x-0' },
          { t: 'Wardrobe', s: { right: 'calc(50% - 138px)' },c: expanded ? 'opacity-100 translate-x-0'  : 'opacity-0 -translate-x-10' },
        ].map(({ t, s, c }) => (
          <span key={t} className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${c}`} style={s}>{t}</span>
        ))}
      </div>
    </button>
  );
};

// ============================================
// FOOTER
// ============================================
const Footer = ({ onTabChange, onOpenAuth, user, onSignOut }) => {
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: 'Virtrobe',
      links: [
        { label: 'About',    action: () => {} },
        { label: 'Blog',     action: () => {} },
        { label: 'Careers',  action: () => {} },
        { label: 'Press',    action: () => {} },
      ],
    },
    {
      heading: 'Product',
      links: [
        { label: 'Explore',    action: () => onTabChange('home') },
        { label: 'Try On',     action: () => onTabChange('tryon') },
        { label: 'Moodboards', action: () => onTabChange('moodboard') },
        { label: 'Admin',      action: () => { window.location.pathname = '/admin'; } },
      ],
    },
    {
      heading: 'Account',
      links: user
        ? [
            { label: 'Profile',  action: () => {} },
            { label: 'Sign out', action: onSignOut },
          ]
        : [
            { label: 'Sign in',       action: onOpenAuth },
            { label: 'Create account', action: onOpenAuth },
          ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy',    action: () => {} },
        { label: 'Terms of Service',  action: () => {} },
        { label: 'Cookie Policy',     action: () => {} },
      ],
    },
  ];

  return (
    <footer className="border-t border-black/8 bg-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {columns.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-[9px] font-semibold text-black uppercase tracking-[0.25em] mb-4" style={serif}>
                {heading}
              </p>
              <ul className="space-y-2.5">
                {links.map(({ label, action }) => (
                  <li key={label}>
                    <button
                      onClick={action}
                      className="text-[12px] text-black/40 hover:text-black transition-colors" style={serif}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-8 border-t border-black/6">
          <p className="text-[10px] text-black/25" style={serif}>
            © {year} Virtrobe. All rights reserved.
          </p>
          <p className="text-[10px] text-black/20" style={serif}>
            Virtual try-on, real expression.
          </p>
        </div>
      </div>
    </footer>
  );
};

// ============================================
// NAVIGATION
// ============================================
const Navigation = ({ currentTab, onTabChange, user, onOpenAuth, onSignOut, children }) => {
  const [search, setSearch] = useState('');
  const [userMenu, setUserMenu] = useState(false);

  const tabs = [
    { id: 'home',      label: 'Explore',    icon: Grid3x3  },
    { id: 'tryon',     label: 'Try On',     icon: Sparkles },
    { id: 'moodboard', label: 'Moodboards', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-black/6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <BrandLogo onClick={() => onTabChange('home')} />

            {/* Search */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search styles, brands, trends…"
                  className="w-full h-9 pl-10 pr-4 rounded-full bg-black/[0.03] text-black placeholder-black/25 text-[12px] border border-black/8 focus:border-black/20 focus:bg-white focus:outline-none transition-all"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/25" />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Sign in link (when logged out) */}
              {!user && (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 text-[11px] text-black/45 hover:text-black transition-colors"
                  style={serif}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </button>
              )}

              {/* User avatar / menu */}
              <div className="relative">
                <button
                  onClick={() => user ? setUserMenu((v) => !v) : onOpenAuth()}
                  className="w-9 h-9 rounded-full bg-black flex items-center justify-center hover:bg-black/80 transition-colors overflow-hidden"
                >
                  {user?.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <User className="w-4 h-4 text-white" />
                  }
                </button>

                {userMenu && user && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 top-11 z-50 w-52 bg-white border border-black/8 rounded-2xl shadow-xl overflow-hidden py-1">
                      <div className="px-4 py-3 border-b border-black/6">
                        <p className="text-[12px] font-semibold text-black truncate">
                          {user.user_metadata?.display_name ?? 'My Account'}
                        </p>
                        <p className="text-[10px] text-black/30 truncate mt-0.5">{user.email}</p>
                      </div>
                      {[
                        { label: 'My Profile',     action: () => {} },
                        { label: 'My Uploads',     action: () => {} },
                        { label: 'Settings',       action: () => {} },
                      ].map(({ label, action }) => (
                        <button
                          key={label}
                          onClick={() => { action(); setUserMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[11px] text-black/50 hover:text-black hover:bg-black/[0.025] transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                      <div className="border-t border-black/6 mt-1">
                        <button
                          onClick={() => { onSignOut(); setUserMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[11px] text-black/40 hover:text-red-500 hover:bg-red-50/50 transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-3 h-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tab row */}
          <div className="flex items-center justify-center gap-1 h-11 border-t border-black/[0.04]">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  currentTab === id
                    ? 'bg-black text-white'
                    : 'text-black/45 hover:bg-black/5 hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 pt-28 px-6 pb-0">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer
        onTabChange={onTabChange}
        onOpenAuth={onOpenAuth}
        user={user}
        onSignOut={onSignOut}
      />
    </div>
  );
};

// ============================================
// WELCOME
// ============================================
const WelcomePage = ({ onComplete }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-6">
    <div className="max-w-2xl w-full space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-2">
          <span className="text-4xl">👔</span>
        </div>
        <h1 className="text-4xl font-light tracking-tight text-black" style={serif}>
          Welcome to Virtual Wardrobe
        </h1>
        <p className="text-base text-black/40 font-light" style={serif}>
          Your personal styling assistant
        </p>
      </div>
      <div>
        <p className="text-center text-[12px] text-black/30 mb-6" style={serif}>
          Choose your mannequin to get started
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[['female','👗','Feminine'], ['male','🧥','Masculine']].map(([g, emoji, label]) => (
            <button
              key={g}
              onClick={() => onComplete(g)}
              className="p-8 bg-white border border-black/10 rounded-2xl hover:border-black hover:shadow-lg transition-all duration-300"
            >
              <div className="text-5xl mb-3">{emoji}</div>
              <div className="text-[13px] font-light text-black" style={serif}>{label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// APP
// ============================================
function App() {
  const [welcomed, setWelcomed]     = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [tab, setTab]               = useState('home');
  const [user, setUser]             = useState(null);
  const [showAuth, setShowAuth]     = useState(false);
  const [authReady, setAuthReady]   = useState(false);

  const [outfits, setOutfits] = useState([
    { id: 1, title: 'Summer Breeze',    user: 'StyleQueen',   likes: 234, liked: false, emoji: '👗' },
    { id: 2, title: 'Business Casual',  user: 'ProFashion',   likes: 189, liked: false, emoji: '🧥' },
    { id: 3, title: 'Urban Chic',       user: 'TrendSetter',  likes: 312, liked: false, emoji: '👔' },
    { id: 4, title: 'Evening Elegance', user: 'GlamGuru',     likes: 456, liked: false, emoji: '👠' },
    { id: 5, title: 'Cozy Comfort',     user: 'FitFashion',   likes: 278, liked: false, emoji: '👟' },
    { id: 6, title: 'Vintage Revival',  user: 'ClassicStyle', likes: 167, liked: false, emoji: '🎩' },
  ]);

  // Auth init
  useEffect(() => {
    authService.getCurrentUser()
      .then(setUser).catch(() => setUser(null))
      .finally(() => setAuthReady(true));
    return authService.onAuthStateChange(setUser);
  }, []);

  const handleSignOut = () => { authService.signOut(); setUser(null); };

  if (window.location.pathname === '/admin') return <AdminPage />;
  if (!authReady) return null;
  if (!welcomed) {
    return <WelcomePage onComplete={(g) => { setUserGender(g); setWelcomed(true); }} />;
  }

  return (
    <>
      {/* Auth modal */}
      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[620px] rounded-2xl overflow-hidden shadow-2xl">
            <AuthPage onAuthSuccess={(u) => { setUser(u); setShowAuth(false); }} />
          </div>
        </div>
      )}

      <Navigation
        currentTab={tab}
        onTabChange={setTab}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onSignOut={handleSignOut}
      >
        {tab === 'home' && (
          <HomePage
            outfits={outfits}
            onLike={(id) =>
              setOutfits((prev) => prev.map((o) =>
                o.id === id ? { ...o, liked: !o.liked, likes: o.liked ? o.likes - 1 : o.likes + 1 } : o
              ))
            }
          />
        )}
        {tab === 'search'    && <SearchPage />}
        {tab === 'tryon'     && (
          <TryOnPage
            user={user}
            userGender={userGender}
            onUserChange={setUser}
            onOpenAuth={() => setShowAuth(true)}
          />
        )}
        {tab === 'moodboard' && <MoodboardPage currentUser={user} />}
      </Navigation>
    </>
  );
}

export default App;