import React, { useState, useEffect } from 'react';
import { Search, User, Grid3x3, Sparkles, Heart } from 'lucide-react';

// Import your page components
import HomePage from './components/pages/HomePage';
import SearchPage from './components/pages/SearchPage';
import TryOnPage from './components/pages/TryOnPage';
import MoodboardPage from './components/pages/MoodboardPage';
import AdminPage from './components/pages/AdminPage'; // NEW
import { useMoodboard } from './hooks/useMoodboard';

// ============================================
// BRAND LOGO ANIMATION - "Virtrobe" ↔ "Virtual Wardrobe"
// ============================================
const BrandLogo = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    const animationCycle = () => {
      setIsExpanded(false);
      setTimeout(() => setIsExpanded(true), 2500);
      setTimeout(() => setIsExpanded(false), 5500);
    };
    animationCycle();
    const interval = setInterval(animationCycle, 8000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative h-12 flex items-center justify-center overflow-hidden w-80">
      <div className="relative flex items-center justify-center">
        <span 
          className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${
            isExpanded ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
          }`}
          style={{ left: 'calc(50% - 60px)' }}
        >
          Virt
        </span>
        <span 
          className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
          }`}
          style={{ left: 'calc(50% - 140px)' }}
        >
          Virtual
        </span>
        <span 
          className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${
            isExpanded ? 'opacity-0 translate-x-12' : 'opacity-100 translate-x-0'
          }`}
          style={{ right: 'calc(50% - 60px)' }}
        >
          robe
        </span>
        <span 
          className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
          }`}
          style={{ right: 'calc(50% - 145px)' }}
        >
          Wardrobe
        </span>
      </div>
    </div>
  );
};

// ============================================
// NAVIGATION COMPONENT
// ============================================
const Navigation = ({ currentTab, onTabChange, children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const navLinks = [
    { id: 'home',      label: 'Explore', icon: Grid3x3  },
    { id: 'tryon',     label: 'Try On',  icon: Sparkles },
    { id: 'moodboard', label: 'Saved',   icon: Heart    },
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
            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors duration-200">
                <User className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-1 h-12 border-t border-gray-50">
            {navLinks.map(({ id, label, icon: Icon }) => {
              const active = currentTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-light text-sm transition-all duration-200 ${
                    active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
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
// WELCOME PAGE COMPONENT
// ============================================
const WelcomePage = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-full mb-4">
            <span className="text-5xl">👔</span>
          </div>
          <h1 className="text-5xl font-light tracking-tight">Welcome to Virtual Wardrobe</h1>
          <p className="text-xl text-gray-500 font-light">
            Your personal styling assistant
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-gray-600 font-light mb-8">
            Choose your mannequin preference to get started
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onComplete('female')}
              className="p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-black hover:shadow-lg transition-all duration-300"
            >
              <div className="text-6xl mb-4">👗</div>
              <div className="text-lg font-light text-black">Feminine</div>
            </button>
            <button
              onClick={() => onComplete('male')}
              className="p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-black hover:shadow-lg transition-all duration-300"
            >
              <div className="text-6xl mb-4">🧥</div>
              <div className="text-lg font-light text-black">Masculine</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  
  const { savedOutfits, saveOutfit, removeOutfit } = useMoodboard();
  
  const [outfits, setOutfits] = useState([
    { id: 1, title: 'Summer Breeze',     description: 'Light linen perfection',  user: 'StyleQueen',  likes: 234, liked: false, emoji: '👗' },
    { id: 2, title: 'Business Casual',   description: 'Office ready elegance',   user: 'ProFashion',  likes: 189, liked: false, emoji: '🧥' },
    { id: 3, title: 'Urban Chic',        description: 'Street style vibes',      user: 'TrendSetter', likes: 312, liked: false, emoji: '👔' },
    { id: 4, title: 'Evening Elegance',  description: 'Night out perfection',    user: 'GlamGuru',    likes: 456, liked: false, emoji: '👠' },
    { id: 5, title: 'Cozy Comfort',      description: 'Athleisure at its best',  user: 'FitFashion',  likes: 278, liked: false, emoji: '👟' },
    { id: 6, title: 'Vintage Revival',   description: 'Timeless retro charm',    user: 'ClassicStyle', likes: 167, liked: false, emoji: '🎩' },
  ]);
  
  // Check if current URL is /admin — simple routing without react-router
  const isAdminRoute = window.location.pathname === '/admin';

  const handleWelcomeComplete = (gender) => {
    setUserGender(gender);
    setHasCompletedWelcome(true);
  };
  
  const handleLike = (id) => {
    setOutfits(outfits.map(outfit => 
      outfit.id === id 
        ? { ...outfit, liked: !outfit.liked, likes: outfit.liked ? outfit.likes - 1 : outfit.likes + 1 }
        : outfit
    ));
  };
  
  const handleSaveOutfit = (outfit) => {
    saveOutfit(outfit);
  };
  
  const handleSearch = (searchData) => {
    console.log('Search initiated:', searchData);
    setTimeout(() => setCurrentTab('tryon'), 1500);
  };

  // ── Admin route — bypasses welcome screen entirely ──
  if (isAdminRoute) {
    return <AdminPage />;
  }
  
  if (!hasCompletedWelcome) {
    return <WelcomePage onComplete={handleWelcomeComplete} />;
  }
  
  return (
    <Navigation currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'home' && (
        <HomePage outfits={outfits} onLike={handleLike} />
      )}
      {currentTab === 'search' && (
        <SearchPage onSearch={handleSearch} />
      )}
      {currentTab === 'tryon' && (
        <TryOnPage onSave={handleSaveOutfit} userGender={userGender} />
      )}
      {currentTab === 'moodboard' && (
        <MoodboardPage savedOutfits={savedOutfits} onRemove={removeOutfit} />
      )}
    </Navigation>
  );
}

export default App;