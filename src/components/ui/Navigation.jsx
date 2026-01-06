import React from 'react';
import { Home, Search, Camera, Layout } from 'lucide-react';

const Navigation = ({ currentTab, onTabChange, userGender, children }) => {
  const navItems = [
    { id: 'home', label: 'Atelier', icon: Home },
    { id: 'search', label: 'Discover', icon: Search },
    { id: 'tryon', label: 'Try On', icon: Camera },
    { id: 'moodboard', label: 'Collection', icon: Layout },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      
      {/* VINTAGE RED NAV BAR */}
      <nav className="
        sticky top-0 z-50
        bg-gradient-to-r from-red-900 via-red-800 to-red-900
        backdrop-blur-md
        border-b-2 border-red-950/30
        shadow-[0_8px_32px_rgba(127,29,29,0.4)]
      ">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">

            {/* LOGO - Gold accent on red */}
            <div className="flex items-center gap-4">
              <div className="
                w-12 h-12 rounded-2xl
                bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-800
                flex items-center justify-center
                shadow-[0_4px_20px_rgba(217,119,6,0.5)]
                border-2 border-amber-400/30
              ">
                <span className="text-red-950 font-display text-2xl font-bold">
                  S
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-display font-semibold text-amber-100">
                  Silouvera
                </h1>
                <p className="text-xs tracking-widest text-red-200/80 font-body">
                  VIRTUAL ATELIER
                </p>
              </div>
            </div>

            {/* NAV BUTTONS - Vintage red style */}
            <div className="flex items-center gap-2">
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = currentTab === id;

                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={`
                      flex items-center gap-2
                      px-6 py-3 rounded-full
                      font-body font-semibold
                      transition-all duration-300
                      border-2
                      ${active
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-700 text-red-950 shadow-[0_6px_24px_rgba(217,119,6,0.6)] scale-105 border-amber-400/50'
                        : 'text-red-100 border-red-700/50 hover:bg-red-800/80 hover:border-red-600 hover:shadow-[0_4px_16px_rgba(127,29,29,0.4)] hover:scale-105'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden md:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* USER BADGE - Gold on red */}
            <div className="
              px-5 py-2 rounded-full
              bg-gradient-to-r from-amber-700/30 to-red-800/50
              border-2 border-amber-600/40
              shadow-inner
              backdrop-blur-sm
            ">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span className="text-sm font-body font-semibold text-amber-100">
                  {userGender === 'female' ? 'Feminine Form' : 'Masculine Form'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* PAGE CONTENT - Centered container */}
      <main className="px-6 pt-10 pb-20">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
};

export default Navigation;