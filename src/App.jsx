// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Search, User, Grid3x3, Sparkles, BookOpen } from 'lucide-react';

import HomePage     from './components/pages/HomePage';
import SearchPage   from './components/pages/SearchPage';
import TryOnPage    from './components/pages/TryOnPage';
import MoodboardPage from './components/pages/MoodboardPage';
import AdminPage    from './components/pages/AdminPage';
import AuthPage     from './components/pages/AuthPage';
import authService  from './services/authService';

// ============================================
// BRAND LOGO
// ============================================
const BrandLogo = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const cycle = () => {
      setIsExpanded(false);
      setTimeout(() => setIsExpanded(true), 2500);
      setTimeout(() => setIsExpanded(false), 5500);
    };
    cycle();
    const id = setInterval(cycle, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-12 flex items-center justify-center overflow-hidden w-80">
      <div className="relative flex items-center justify-center">
        {[
          { text: 'Virt',     cls: isExpanded ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0', style: { left: 'calc(50% - 60px)' } },
          { text: 'Virtual',  cls: isExpanded ? 'opacity-100 translate-x-0'  : 'opacity-0 translate-x-12',  style: { left: 'calc(50% - 140px)' } },
          { text: 'robe',     cls: isExpanded ? 'opacity-0 translate-x-12'   : 'opacity-100 translate-x-0', style: { right: 'calc(50% - 60px)' } },
          { text: 'Wardrobe', cls: isExpanded ? 'opacity-100 translate-x-0'  : 'opacity-0 -translate-x-12', style: { right: 'calc(50% - 145px)' } },
        ].map(({ text, cls, style }) => (
          <span
            key={text}
            className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${cls}`}
            style={style}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};

// ============================================
// NAVIGATION
// ============================================
const Navigation = ({ currentTab, onTabChange, user, onOpenAuth, onSignOut, children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home',      label: 'Explore',    icon: Grid3x3  },
    { id: 'tryon',     label: 'Try On',     icon: Sparkles },
    { id: 'moodboard', label: 'Moodboards', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <BrandLogo />
            </div>

            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search styles, brands, trends..."
                  className="w-full h-10 pl-11 pr-4 rounded-full bg-gray-50 text-black placeholder-gray-400 text-sm font-light border border-gray-200 focus:border-black focus:outline-none focus:bg-white transition-all duration-200"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* User button */}
            <div className="relative">
              <button
                onClick={() => user ? setUserMenuOpen((v) => !v) : onOpenAuth()}
                className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors duration-200 overflow-hidden"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </button>

              {/* User dropdown */}
              {userMenuOpen && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-48 bg-white border border-black/8 rounded-2xl shadow-xl overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-black/6">
                      <p className="text-[11px] font-semibold text-black truncate">
                        {user.user_metadata?.display_name ?? user.email}
                      </p>
                      <p className="text-[10px] text-black/35 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { onSignOut(); setUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[11px] text-black/50 hover:text-black hover:bg-black/[0.03] transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center justify-center gap-1 h-12 border-t border-gray-50">
            {navLinks.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-light text-sm transition-all duration-200 ${
                  currentTab === id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="pt-28 px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

// ============================================
// WELCOME PAGE
// ============================================
const WelcomePage = ({ onComplete }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-6">
    <div className="max-w-2xl w-full space-y-12">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-full mb-4">
          <span className="text-5xl">👔</span>
        </div>
        <h1 className="text-5xl font-light tracking-tight">Welcome to Virtual Wardrobe</h1>
        <p className="text-xl text-gray-500 font-light">Your personal styling assistant</p>
      </div>
      <div className="space-y-4">
        <p className="text-center text-gray-600 font-light mb-8">Choose your mannequin preference to get started</p>
        <div className="grid grid-cols-2 gap-4">
          {[['female', '👗', 'Feminine'], ['male', '🧥', 'Masculine']].map(([g, emoji, label]) => (
            <button
              key={g}
              onClick={() => onComplete(g)}
              className="p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-black hover:shadow-lg transition-all duration-300"
            >
              <div className="text-6xl mb-4">{emoji}</div>
              <div className="text-lg font-light text-black">{label}</div>
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
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [outfits, setOutfits] = useState([
    { id: 1, title: 'Summer Breeze',    description: 'Light linen perfection', user: 'StyleQueen',  likes: 234, liked: false, emoji: '👗' },
    { id: 2, title: 'Business Casual',  description: 'Office ready elegance',  user: 'ProFashion',  likes: 189, liked: false, emoji: '🧥' },
    { id: 3, title: 'Urban Chic',       description: 'Street style vibes',     user: 'TrendSetter', likes: 312, liked: false, emoji: '👔' },
    { id: 4, title: 'Evening Elegance', description: 'Night out perfection',   user: 'GlamGuru',    likes: 456, liked: false, emoji: '👠' },
    { id: 5, title: 'Cozy Comfort',     description: 'Athleisure at its best', user: 'FitFashion',  likes: 278, liked: false, emoji: '👟' },
    { id: 6, title: 'Vintage Revival',  description: 'Timeless retro charm',   user: 'ClassicStyle',likes: 167, liked: false, emoji: '🎩' },
  ]);

  // ── Auth state ───────────────────────────────────────────────────────────
  useEffect(() => {
    authService.getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));

    const unsubscribe = authService.onAuthStateChange((u) => setUser(u));
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const isAdminRoute = window.location.pathname === '/admin';
  if (isAdminRoute) return <AdminPage />;
  if (!authChecked) return null; // wait for session check before rendering

  if (!hasCompletedWelcome) {
    return <WelcomePage onComplete={(g) => { setUserGender(g); setHasCompletedWelcome(true); }} />;
  }

  return (
    <>
      {/* Auth modal */}
      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[620px] rounded-2xl overflow-hidden shadow-2xl">
            <AuthPage
              onAuthSuccess={(u) => { setUser(u); setShowAuth(false); }}
            />
          </div>
        </div>
      )}

      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onSignOut={handleSignOut}
      >
        {currentTab === 'home' && (
          <HomePage
            outfits={outfits}
            onLike={(id) =>
              setOutfits((prev) =>
                prev.map((o) =>
                  o.id === id ? { ...o, liked: !o.liked, likes: o.liked ? o.likes - 1 : o.likes + 1 } : o
                )
              )
            }
          />
        )}
        {currentTab === 'search' && <SearchPage />}
        {currentTab === 'tryon' && (
          <TryOnPage
            user={user}
            userGender={userGender}
            onUserChange={setUser}
          />
        )}
        {currentTab === 'moodboard' && (
          <MoodboardPage currentUser={user} />
        )}
      </Navigation>
    </>
  );
}

export default App;