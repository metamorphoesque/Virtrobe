// src/App.jsx
// Changes vs previous version:
//   • Profile tab added to nav only when user is logged in
//   • Bell (notification) icon appears in nav only when logged in
//   • Cookie consent banner (accept/reject) on first visit — persisted to localStorage
//   • First-visit welcome modal for logged-out users (shown once per session)

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Grid3x3, Sparkles, BookOpen, LogIn, LogOut,
  Bell, UserCircle2, X, Cookie, Check, Users, Heart,
} from 'lucide-react';

import HomePage      from './components/pages/HomePage';
import TryOnPage     from './components/pages/TryOnPage';
import MoodboardPage from './components/pages/MoodboardPage';
import ProfilePage   from './components/pages/ProfilePage';
import AdminPage     from './components/pages/AdminPage';
import AuthPage      from './components/pages/AuthPage';
import authService   from './services/authService';
import DevRouter     from './dev/DevRouter';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const mono  = { fontFamily: "'DM Mono', 'Courier New', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Consent Banner
// ─────────────────────────────────────────────────────────────────────────────
const CookieBanner = ({ onAccept, onReject }) => (
  <div
    className="fixed bottom-0 left-0 right-0 z-[300] p-3 sm:p-4"
    style={{ animation: 'slideUp 0.55s cubic-bezier(0.22,1,0.36,1) both' }}
  >
    <style>{`@keyframes slideUp { from{transform:translateY(110%);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
    <div className="max-w-xl mx-auto bg-white border border-black/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-0.5 bg-black w-full" />
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Cookie className="w-4 h-4 text-black/35" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-light text-black mb-1 leading-snug" style={serif}>
            We use cookies to personalise your experience.
          </p>
          <p className="text-[10px] text-black/40 leading-relaxed">
            Helps us surface styles matching your taste.{' '}
            <button className="underline underline-offset-2 hover:text-black/65 transition-colors">
              Learn more
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <button
            onClick={onReject}
            className="px-3.5 py-1.5 text-[11px] text-black/40 border border-black/10 rounded-xl hover:border-black/25 hover:text-black transition-all"
            style={serif}
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            className="px-3.5 py-1.5 text-[11px] text-white bg-black rounded-xl hover:bg-black/80 transition-all flex items-center gap-1.5"
            style={serif}
          >
            <Check className="w-3 h-3" />Accept
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// First-visit Welcome Modal (logged-out users only, once per session)
// ─────────────────────────────────────────────────────────────────────────────
const WelcomeModal = ({ onSignIn, onDismiss }) => (
  <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/38 backdrop-blur-sm" onClick={onDismiss} />
    <div
      className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      style={{ animation: 'scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <style>{`@keyframes scaleIn{from{transform:scale(0.93);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      <div className="h-1 bg-black w-full" />
      <div className="px-7 py-7">
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-[9px] text-black/25 uppercase tracking-[0.4em] mb-4" style={serif}>Virtrobe</p>
        <h2
          className="font-light text-black mb-3 leading-[1.05]"
          style={{ ...serif, fontSize: 'clamp(1.7rem, 4vw, 2.2rem)' }}
        >
          Virtual try-on,<br />real expression.
        </h2>
        <p className="text-[12px] text-black/42 leading-relaxed mb-7" style={serif}>
          Browse public outfits freely. Sign in to save looks, build your archive, and share your style with the community.
        </p>

        <div className="space-y-2">
          <button
            onClick={onSignIn}
            className="w-full py-3 bg-black text-white text-[11px] rounded-xl flex items-center justify-center gap-2 hover:bg-black/80 transition-all"
            style={{ ...serif, letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in or create account
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 text-[11px] text-black/30 hover:text-black transition-colors"
            style={serif}
          >
            Continue browsing →
          </button>
        </div>
        <p className="text-[9px] text-black/18 text-center mt-4" style={serif}>
          Free to browse · No card required
        </p>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Brand Logo (animated Virt↔Virtual, robe↔Wardrobe)
// ─────────────────────────────────────────────────────────────────────────────
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
          { t:'Virt',     s:{ left:'calc(50% - 56px)'  }, c: expanded?'opacity-0 -translate-x-10':'opacity-100 translate-x-0' },
          { t:'Virtual',  s:{ left:'calc(50% - 132px)' }, c: expanded?'opacity-100 translate-x-0' :'opacity-0 translate-x-10'  },
          { t:'robe',     s:{ right:'calc(50% - 56px)' }, c: expanded?'opacity-0 translate-x-10'  :'opacity-100 translate-x-0' },
          { t:'Wardrobe', s:{ right:'calc(50% - 138px)'},  c: expanded?'opacity-100 translate-x-0' :'opacity-0 -translate-x-10' },
        ].map(({ t, s, c }) => (
          <span key={t} className={`text-black text-3xl font-bold transition-all duration-1000 ease-in-out absolute ${c}`} style={s}>{t}</span>
        ))}
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification Bell — auth-gated, shown only when logged in
// ─────────────────────────────────────────────────────────────────────────────
const NotificationBell = ({ userId }) => {
  const [open,   setOpen]   = useState(false);
  // Stub notifications — wire to a real notifications table later
  const notifs = [
    { id:'n1', text:'miachen liked your Autumn Edit look.',    time:'2m ago',  read:false },
    { id:'n2', text:'jamesporter started following you.',      time:'18m ago', read:false },
    { id:'n3', text:'Your Studio Look was featured publicly.', time:'1h ago',  read:true  },
  ];
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-black/35 hover:text-black hover:border-black/25 transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[8px] rounded-full flex items-center justify-center leading-none font-medium"
            style={mono}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 bg-white border border-black/8 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-black/6 flex items-center justify-between">
              <p className="text-[12px] font-light text-black" style={serif}>Notifications</p>
              <span className="text-[9px] text-black/25 uppercase tracking-widest" style={mono}>{unread} new</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.04]">
              {notifs.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-2.5 hover:bg-black/[0.02] transition-colors cursor-pointer ${!n.read ? 'bg-black/[0.015]' : ''}`}
                >
                  {!n.read
                    ? <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 flex-shrink-0" />
                    : <div className="w-1.5 flex-shrink-0" />
                  }
                  <div>
                    <p className="text-[11px] text-black/60 leading-snug" style={serif}>{n.text}</p>
                    <p className="text-[9px] text-black/22 mt-1" style={mono}>{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-black/5 text-center">
              <button className="text-[10px] text-black/28 hover:text-black transition-colors" style={serif}>
                Mark all as read
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────
const Footer = ({ onTabChange, onOpenAuth, user, onSignOut }) => {
  const year = new Date().getFullYear();
  const columns = [
    { heading:'Virtrobe', links:[
      { label:'About',   fn:()=>{} },
      { label:'Blog',    fn:()=>{} },
      { label:'Careers', fn:()=>{} },
    ]},
    { heading:'Product', links:[
      { label:'Explore',    fn:()=>onTabChange('home')      },
      { label:'Try On',     fn:()=>onTabChange('tryon')     },
      { label:'Moodboards', fn:()=>onTabChange('moodboard') },
    ]},
    { heading:'Account', links: user
      ? [{ label:'My Profile', fn:()=>onTabChange('profile') }, { label:'Sign out', fn:onSignOut }]
      : [{ label:'Sign in', fn:onOpenAuth }, { label:'Create account', fn:onOpenAuth }],
    },
    { heading:'Legal', links:[
      { label:'Privacy Policy',   fn:()=>{} },
      { label:'Terms of Service', fn:()=>{} },
      { label:'Cookie Policy',    fn:()=>{} },
    ]},
  ];

  return (
    <footer className="border-t border-black/8 bg-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {columns.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-[9px] font-semibold text-black uppercase tracking-[0.25em] mb-4" style={serif}>{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, fn }) => (
                  <li key={label}>
                    <button onClick={fn} className="text-[12px] text-black/40 hover:text-black transition-colors" style={serif}>{label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-8 border-t border-black/6">
          <p className="text-[10px] text-black/25" style={serif}>© {year} Virtrobe. All rights reserved.</p>
          <p className="text-[10px] text-black/18" style={serif}>Virtual try-on, real expression.</p>
        </div>
      </div>
    </footer>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────
const Navigation = ({ tab, onTabChange, user, profile, onOpenAuth, onSignOut, children }) => {
  const [search,   setSearch]   = useState('');
  const [userMenu, setUserMenu] = useState(false);

  const displayName = profile?.display_name ?? user?.user_metadata?.display_name ?? user?.email ?? 'Account';
  const avatarUrl   = profile?.avatar_url   ?? user?.user_metadata?.avatar_url   ?? null;
  const initials    = displayName[0]?.toUpperCase() ?? '?';

  // Profile tab is appended only when the user is signed in
  const tabs = [
    { id:'home',      label:'Explore',    Icon:Grid3x3    },
    { id:'tryon',     label:'Try On',     Icon:Sparkles   },
    { id:'moodboard', label:'Moodboards', Icon:BookOpen   },
    ...(user ? [{ id:'profile', label:'Profile', Icon:UserCircle2 }] : []),
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Fixed nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-sm border-b border-black/6">
        <div className="max-w-7xl mx-auto px-6">

          {/* Top bar */}
          <div className="flex items-center justify-between h-16">
            <BrandLogo onClick={() => onTabChange('home')} />

            {/* Search */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search styles, brands, trends…"
                  className="w-full h-9 pl-10 pr-4 rounded-full bg-black/[0.03] text-black placeholder-black/25 text-[12px] border border-black/8 focus:border-black/20 focus:bg-white focus:outline-none transition-all"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/25" />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2.5 flex-shrink-0">

              {/* Bell — only when logged in */}
              {user && <NotificationBell userId={user.id} />}

              {/* Sign-in text — only when logged out */}
              {!user && (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 text-[11px] text-black/45 hover:text-black transition-colors"
                  style={serif}
                >
                  <LogIn className="w-3.5 h-3.5" />Sign in
                </button>
              )}

              {/* Avatar / menu */}
              <div className="relative">
                <button
                  onClick={() => user ? setUserMenu(v => !v) : onOpenAuth()}
                  className="w-9 h-9 rounded-full bg-black flex items-center justify-center hover:bg-black/80 transition-colors overflow-hidden flex-shrink-0"
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    : <span className="text-white text-[13px] font-medium" style={serif}>{initials}</span>
                  }
                </button>

                {userMenu && user && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 top-11 z-50 w-52 bg-white border border-black/8 rounded-2xl shadow-xl overflow-hidden py-1">
                      <div className="px-4 py-3 border-b border-black/6">
                        <p className="text-[12px] font-semibold text-black truncate">{displayName}</p>
                        <p className="text-[10px] text-black/28 truncate mt-0.5">{user.email}</p>
                      </div>
                      {[
                        { label:'My Profile', fn:() => { onTabChange('profile'); setUserMenu(false); } },
                        { label:'Settings',   fn:() => setUserMenu(false) },
                      ].map(({ label, fn }) => (
                        <button key={label} onClick={fn}
                          className="w-full text-left px-4 py-2.5 text-[11px] text-black/50 hover:text-black hover:bg-black/[0.025] transition-colors">
                          {label}
                        </button>
                      ))}
                      <div className="border-t border-black/6 mt-1">
                        <button onClick={() => { onSignOut(); setUserMenu(false); }}
                          className="w-full text-left px-4 py-2.5 text-[11px] text-black/40 hover:text-red-500 hover:bg-red-50/50 transition-colors flex items-center gap-2">
                          <LogOut className="w-3 h-3" />Sign out
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
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  tab === id ? 'bg-black text-white' : 'text-black/45 hover:bg-black/5 hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-28 px-6 pb-0">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      <Footer onTabChange={onTabChange} onOpenAuth={onOpenAuth} user={user} onSignOut={onSignOut} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Mannequin picker (first-ever visit)
// ─────────────────────────────────────────────────────────────────────────────
const MannequinPicker = ({ onComplete }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-6">
    <div className="max-w-lg w-full">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-full mb-4">
          <span className="text-3xl">👔</span>
        </div>
        <h1 className="text-3xl font-light text-black" style={serif}>Welcome to Virtrobe</h1>
        <p className="text-[12px] text-black/35 mt-2" style={serif}>Choose your mannequin to get started</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[['female','👗','Feminine'],['male','🧥','Masculine']].map(([g,emoji,label]) => (
          <button key={g} onClick={() => onComplete(g)}
            className="p-8 bg-white border border-black/10 rounded-2xl hover:border-black hover:shadow-lg transition-all duration-300 text-center">
            <div className="text-5xl mb-3">{emoji}</div>
            <div className="text-[13px] font-light text-black" style={serif}>{label}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  // Dev preview — must be first
  const devPage = DevRouter();
  if (devPage) return devPage;

  const [welcomed,  setWelcomed]  = useState(false);
  const [gender,    setGender]    = useState(null);
  const [tab,       setTab]       = useState('home');
  const [user,      setUser]      = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [showAuth,  setShowAuth]  = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Cookie consent: null = not yet decided | 'accepted' | 'rejected'
  const [cookies, setCookies] = useState(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('vt_cookies') : null
  );

  // Welcome modal: show once per session for logged-out users
  const [showWelcome, setShowWelcome] = useState(false);

  // ── Load profile row for a given auth user ──────────────────────────────
  const loadProfile = async (u) => {
    if (!u) { setProfile(null); return; }
    try { setProfile(await authService.getProfile(u.id)); }
    catch  { setProfile(null); }
  };

  // ── Auth init ────────────────────────────────────────────────────────────
  useEffect(() => {
    authService.getCurrentUser()
      .then(async u => {
        setUser(u);
        await loadProfile(u);
        if (!u && !sessionStorage.getItem('vt_seen_welcome')) {
          // Small delay so the page paints first
          setTimeout(() => setShowWelcome(true), 900);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));

    const unsub = authService.onAuthStateChange(async u => {
      setUser(u);
      await loadProfile(u);
      if (u) { setWelcomed(true); setShowWelcome(false); }
    });

    return unsub;
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null); setProfile(null); setTab('home');
  };

  const handleAuthSuccess = async (u) => {
    setUser(u);
    await loadProfile(u);
    setShowAuth(false); setWelcomed(true); setShowWelcome(false);
  };

  const acceptCookies = () => {
    localStorage.setItem('vt_cookies','accepted');
    setCookies('accepted');
  };
  const rejectCookies = () => {
    localStorage.setItem('vt_cookies','rejected');
    setCookies('rejected');
  };

  const dismissWelcome = () => {
    sessionStorage.setItem('vt_seen_welcome','1');
    setShowWelcome(false);
  };

  const handleTabChange = (t) => {
    if (t === 'profile' && !user) { setShowAuth(true); return; }
    setTab(t);
  };

  // ── Route guards ─────────────────────────────────────────────────────────
  if (window.location.pathname === '/admin') return <AdminPage />;
  if (!authReady) return null;                       // wait for session check
  if (!welcomed) {
    return (
      <>
        <MannequinPicker onComplete={g => { setGender(g); setWelcomed(true); }} />
        {cookies === null && <CookieBanner onAccept={acceptCookies} onReject={rejectCookies} />}
      </>
    );
  }

  return (
    <>
      {/* Auth modal */}
      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[620px] rounded-2xl overflow-hidden shadow-2xl">
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}

      {/* Welcome modal — logged-out first-time visitors */}
      {showWelcome && !user && (
        <WelcomeModal
          onSignIn={() => { dismissWelcome(); setShowAuth(true); }}
          onDismiss={dismissWelcome}
        />
      )}

      {/* Cookie banner */}
      {cookies === null && (
        <CookieBanner onAccept={acceptCookies} onReject={rejectCookies} />
      )}

      <Navigation
        tab={tab}
        onTabChange={handleTabChange}
        user={user}
        profile={profile}
        onOpenAuth={() => setShowAuth(true)}
        onSignOut={handleSignOut}
      >
        {tab === 'home'      && <HomePage />}
        {tab === 'tryon'     && <TryOnPage user={user} userGender={gender} onUserChange={setUser} onOpenAuth={() => setShowAuth(true)} />}
        {tab === 'moodboard' && <MoodboardPage currentUser={user} />}
        {tab === 'profile'   && (
          <ProfilePage
            currentUser={user}
            onOpenAuth={() => setShowAuth(true)}
            initialProfile={profile}
            onProfileUpdate={p => setProfile(p)}
          />
        )}
      </Navigation>
    </>
  );
}

export default App;