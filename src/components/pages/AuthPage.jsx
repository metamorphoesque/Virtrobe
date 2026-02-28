// src/components/pages/AuthPage.jsx
// Login view stays exactly as before.
// "Create account" tab now renders SignUpPage (multi-step).

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import authService from '../../services/authService';
import SignUpPage  from './SignUpPage';

// ─────────────────────────────────────────────────────────────────────────────
// Styles (same as original AuthPage)
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideRight {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes panelReveal {
    from { clip-path: inset(0 100% 0 0); }
    to   { clip-path: inset(0 0% 0 0); }
  }

  .anim-fade-up { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in { animation: fadeIn 0.6s ease both; }
  .anim-slide-r { animation: slideRight 0.8s cubic-bezier(0.22,1,0.36,1) both; transform-origin: left; }
  .anim-panel   { animation: panelReveal 1s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-marquee { animation: marquee 18s linear infinite; }
  .cursor-blink { animation: cursorBlink 1.1s step-end infinite; }

  .d-0{animation-delay:0ms}   .d-1{animation-delay:80ms}  .d-2{animation-delay:160ms}
  .d-3{animation-delay:240ms} .d-4{animation-delay:320ms} .d-5{animation-delay:400ms}
  .d-6{animation-delay:480ms} .d-7{animation-delay:560ms} .d-8{animation-delay:640ms}

  .field-line { position: relative; }
  .field-line::after {
    content:''; position:absolute; bottom:0; left:0;
    width:100%; height:1px; background:black;
    transform:scaleX(0); transform-origin:left;
    transition:transform 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .field-line:focus-within::after { transform:scaleX(1); }
`;

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

// ─────────────────────────────────────────────────────────────────────────────
// Google icon
// ─────────────────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Left editorial panel (login view only)
// ─────────────────────────────────────────────────────────────────────────────
const LeftPanel = () => {
  const panelRef = useRef(null);
  const layer1   = useRef(null);
  const layer2   = useRef(null);
  const layer3   = useRef(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onMove = (e) => {
      const rect = panel.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      if (layer1.current) layer1.current.style.transform = `translate(${nx*6}px,${ny*4}px)`;
      if (layer2.current) layer2.current.style.transform = `translate(${nx*14}px,${ny*8}px)`;
      if (layer3.current) layer3.current.style.transform = `translate(${nx*22}px,${ny*14}px)`;
    };
    const onLeave = () => [layer1,layer2,layer3].forEach(r=>{ if(r.current) r.current.style.transform='translate(0,0)'; });
    panel.addEventListener('mousemove', onMove);
    panel.addEventListener('mouseleave', onLeave);
    return () => { panel.removeEventListener('mousemove', onMove); panel.removeEventListener('mouseleave', onLeave); };
  }, []);

  const lines = [
    { tag: 'Outfit check.',       sub: 'Show us what you\'re wearing.' },
    { tag: 'Step out, virtually.',sub: 'Your wardrobe. Your rules.'    },
    { tag: 'Dress the future.',   sub: 'Try it on before it arrives.'  },
  ];
  const [lineIdx, setLineIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setLineIdx(i=>(i+1)%lines.length); setVisible(true); }, 400);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div ref={panelRef} className="relative w-[60%] h-full bg-black overflow-hidden flex-shrink-0 select-none" style={{cursor:'none'}}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#noise)"/>
      </svg>
      <div ref={layer1} className="absolute inset-0 pointer-events-none" style={{transition:'transform 0.8s cubic-bezier(0.22,1,0.36,1)'}}>
        <div className="absolute top-[28%] left-10 right-10 h-px bg-white/6 anim-slide-r d-0"/>
        <div className="absolute top-[29%] left-10 right-24 h-px bg-white/3 anim-slide-r d-1"/>
        <div className="absolute top-14 bottom-14 left-[35%] w-px bg-white/4 anim-fade-in d-2"/>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full border border-white/[0.04] anim-fade-in d-3"/>
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full border border-white/[0.03] anim-fade-in d-4"/>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full border border-white/[0.04] anim-fade-in d-2"/>
      </div>
      <div className="absolute top-9 left-9 z-10 anim-fade-up d-0">
        <span className="text-white text-[11px] font-light tracking-[0.35em] uppercase" style={serif}>Virtrobe</span>
      </div>
      <div ref={layer2} className="absolute top-8 right-9 z-10 flex flex-col items-end" style={{transition:'transform 0.7s cubic-bezier(0.22,1,0.36,1)'}}>
        <span className="text-white/10 text-[9px] tracking-[0.3em] uppercase anim-fade-in d-1" style={serif}>Est.</span>
        <span className="text-white/[0.08] font-light leading-none anim-fade-up d-2" style={{...serif,fontSize:'4.5rem'}}>2025</span>
      </div>
      <div ref={layer3} className="absolute inset-0 flex flex-col justify-end p-10 pb-12 z-10" style={{transition:'transform 0.5s cubic-bezier(0.22,1,0.36,1)'}}>
        <div className="mb-6" style={{opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(10px)',transition:'opacity 0.4s ease,transform 0.4s cubic-bezier(0.22,1,0.36,1)'}}>
          <p className="text-white/25 text-[9px] tracking-[0.45em] uppercase mb-5" style={serif}>Your digital wardrobe</p>
          <h1 className="text-white font-light leading-[1.02]" style={{...serif,fontSize:'clamp(2.2rem,3.8vw,3.5rem)'}}>{lines[lineIdx].tag}</h1>
          <p className="text-white/35 font-light mt-2" style={{...serif,fontSize:'clamp(1rem,1.6vw,1.3rem)'}}><em>{lines[lineIdx].sub}</em></p>
        </div>
        <div className="h-px bg-white/15 mb-5 anim-slide-r d-5" style={{width:'3rem',transformOrigin:'left'}}/>
        <p className="text-white/30 leading-relaxed max-w-[260px] anim-fade-up d-6" style={{...serif,fontSize:'0.82rem'}}>
          Try on any garment on your personalised 3D silhouette. Curate looks. Share with the world.
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-white/[0.06] flex items-center overflow-hidden z-20">
        <div className="anim-marquee flex gap-0 whitespace-nowrap">
          {Array(6).fill("OUTFIT CHECK · VIRTUAL TRY-ON · VIRTROBE · SHOW US WHAT YOU'RE WEARING · ").map((t,i)=>(
            <span key={i} className="text-white/15 text-[9px] tracking-[0.3em] uppercase px-6" style={serif}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Field component (login only)
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ label, type='text', value, onChange, placeholder, autoComplete, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] text-black/35 uppercase tracking-[0.2em]" style={serif}>{label}</label>
    <div className="relative field-line border-b border-black/12">
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
        className="w-full bg-transparent py-2 text-black placeholder:text-black/18 outline-none"
        style={{...serif,fontSize:'0.95rem'}}/>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AuthPage — login view + delegates signup to SignUpPage
// ─────────────────────────────────────────────────────────────────────────────
const AuthPage = ({ onAuthSuccess }) => {
  const [mode,         setMode]         = useState('login');  // 'login' | 'signup'
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [formKey,      setFormKey]      = useState(0);

  const switchMode = (m) => { setMode(m); setError(''); setFormKey(k=>k+1); };

  // ── Login submit ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authService.signIn({ email, password });
      onAuthSuccess?.(user);
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try { await authService.signInWithGoogle?.(); }
    catch { setError('Google sign-in is not configured yet.'); }
  };

  // ── Signup mode — render SignUpPage fullscreen ────────────────────────────
  if (mode === 'signup') {
    return (
      <>
        <style>{STYLES}</style>
        <SignUpPage
          onSuccess={onAuthSuccess}
          onSignIn={() => switchMode('login')}
        />
      </>
    );
  }

  // ── Login mode ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="w-full h-screen flex bg-white overflow-hidden">
        <LeftPanel/>

        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <div className="overflow-y-auto h-full flex flex-col justify-center px-10 lg:px-14 py-8">

            {/* Mode tabs */}
            <div className="flex gap-7 mb-8 anim-fade-up d-0">
              {[['login','Sign in'],['signup','Create account']].map(([m,label])=>(
                <button key={m} onClick={()=>switchMode(m)}
                  className="pb-1.5 border-b-[1.5px] transition-all duration-300"
                  style={{...serif,fontSize:'1rem',borderColor:mode===m?'black':'transparent',color:mode===m?'black':'rgba(0,0,0,0.25)'}}>
                  {label}
                </button>
              ))}
            </div>

            <form key={formKey} onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="anim-fade-up d-1">
                <Field label="Email" type="email" value={email}
                  onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email"/>
              </div>

              <div className="anim-fade-up d-2">
                <Field label="Password" type={showPassword?'text':'password'} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password">
                  <button type="button" onClick={()=>setShowPassword(v=>!v)} tabIndex={-1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/60 transition-colors">
                    {showPassword?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
                  </button>
                </Field>
              </div>

              <div className="flex items-center justify-between anim-fade-in d-3">
                {error
                  ? <p className="text-[10px] text-red-400 leading-relaxed flex-1" style={serif}>{error}</p>
                  : <span/>
                }
                <button type="button" className="text-[10px] text-black/25 hover:text-black transition-colors ml-auto" style={serif}>
                  Forgot password?
                </button>
              </div>

              <div className="anim-fade-up d-4">
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-black text-white flex items-center justify-center gap-2 transition-all hover:bg-black/80 active:scale-[0.98] disabled:opacity-40"
                  style={{...serif,fontSize:'0.7rem',letterSpacing:'0.2em',textTransform:'uppercase'}}>
                  {loading
                    ? <div className="w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin"/>
                    : <>Sign in <ArrowRight className="w-3 h-3"/></>
                  }
                </button>
              </div>
            </form>

            <div className="flex items-center gap-3 my-5 anim-fade-in d-5">
              <div className="flex-1 h-px bg-black/7"/>
              <span className="text-[9px] text-black/20 tracking-[0.2em] uppercase" style={serif}>or</span>
              <div className="flex-1 h-px bg-black/7"/>
            </div>

            <div className="anim-fade-up d-6">
              <button onClick={handleGoogle} type="button"
                className="w-full py-2.5 border border-black/10 flex items-center justify-center gap-2.5 text-black/50 hover:border-black/25 hover:text-black transition-all active:scale-[0.98]"
                style={{...serif,fontSize:'0.85rem'}}>
                <GoogleIcon/>Continue with Google
              </button>
            </div>

            <p className="mt-5 text-center text-[10px] text-black/25 anim-fade-in d-7" style={serif}>
              Don't have an account?{' '}
              <button onClick={()=>switchMode('signup')} className="text-black underline underline-offset-2 hover:text-black/60 transition-colors">
                Create one
              </button>
            </p>

            <p className="mt-3 text-center text-[9px] text-black/18 leading-relaxed anim-fade-in d-8" style={serif}>
              By continuing you agree to our{' '}
              <span className="underline underline-offset-2 cursor-pointer hover:text-black/35 transition-colors">Terms</span>
              {' '}and{' '}
              <span className="underline underline-offset-2 cursor-pointer hover:text-black/35 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;