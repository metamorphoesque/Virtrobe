// src/components/pages/SignUpPage.jsx
// Multi-step sign-up: Step 1 = credentials, Step 2 = profile details.
// Matches the Cormorant Garamond editorial aesthetic of AuthPage.
// Props:
//   onSuccess(user)  — called after successful account creation
//   onSignIn()       — switch back to login view

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Loader2, Camera, X } from 'lucide-react';
import authService from '../../services/authService';
import { supabase } from '../../services/authService';

// ── Styles (same keyframes as AuthPage) ──────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; }                             to { opacity:1; } }
  @keyframes slideR   { from { transform:scaleX(0); }                   to { transform:scaleX(1); } }
  @keyframes marquee  { from { transform:translateX(0); }               to { transform:translateX(-50%); } }

  .su-fade-up  { animation: fadeUp  0.65s cubic-bezier(0.22,1,0.36,1) both; }
  .su-fade-in  { animation: fadeIn  0.5s ease both; }
  .su-slide-r  { animation: slideR  0.8s cubic-bezier(0.22,1,0.36,1) both; transform-origin:left; }
  .su-marquee  { animation: marquee 22s linear infinite; }

  .su-d0 { animation-delay:0ms;   }
  .su-d1 { animation-delay:60ms;  }
  .su-d2 { animation-delay:120ms; }
  .su-d3 { animation-delay:180ms; }
  .su-d4 { animation-delay:240ms; }
  .su-d5 { animation-delay:300ms; }
  .su-d6 { animation-delay:360ms; }
  .su-d7 { animation-delay:420ms; }

  .su-field::after {
    content:'';
    position:absolute; bottom:0; left:0;
    width:100%; height:1px;
    background:black;
    transform:scaleX(0); transform-origin:left;
    transition:transform 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .su-field:focus-within::after { transform:scaleX(1); }
`;

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const mono  = { fontFamily: "'DM Mono', 'Courier New', monospace" };

// ── Left editorial panel ──────────────────────────────────────────────────────
const LeftPanel = ({ step }) => {
  const panels = [
    { tag: 'Your wardrobe.', sub: 'Start with who you are.' },
    { tag: 'Make it yours.', sub: 'Set the scene for your style.' },
    { tag: 'You\'re in.', sub: 'Time to dress the future.' },
  ];
  const current = panels[step] ?? panels[0];

  return (
    <div
      className="relative w-[60%] h-full bg-black overflow-hidden flex-shrink-0 select-none"
      style={{ cursor: 'none' }}
    >
      {/* Noise */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="su-noise"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#su-noise)"/>
      </svg>

      {/* Step progress dots */}
      <div className="absolute top-9 right-9 flex items-center gap-2 z-10">
        {[0,1].map(i => (
          <div
            key={i}
            className="transition-all duration-500"
            style={{
              width:  step > i ? 20 : step === i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: step >= i ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="absolute top-9 left-9 z-10 su-fade-up su-d0">
        <span className="text-white text-[11px] font-light tracking-[0.35em] uppercase" style={serif}>Virtrobe</span>
      </div>

      {/* Geometric lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[30%] left-10 right-10 h-px bg-white/6 su-slide-r" style={{animationDelay:'200ms'}}/>
        <div className="absolute top-[31%] left-10 right-20 h-px bg-white/3 su-slide-r" style={{animationDelay:'300ms'}}/>
        <div className="absolute top-16 bottom-16 left-[38%] w-px bg-white/4 su-fade-in" style={{animationDelay:'400ms'}}/>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full border border-white/[0.04] su-fade-in"  style={{animationDelay:'200ms'}}/>
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full border border-white/[0.04] su-fade-in" style={{animationDelay:'300ms'}}/>
      </div>

      {/* Headline — transitions on step change */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-10 pb-12 z-10"
        key={step}
      >
        <p className="text-white/20 text-[9px] tracking-[0.45em] uppercase mb-5 su-fade-up su-d1" style={serif}>
          Step {step + 1} of 2
        </p>
        <h1
          className="text-white font-light leading-[1.02] su-fade-up su-d2"
          style={{ ...serif, fontSize: 'clamp(2rem, 3.5vw, 3.2rem)' }}
        >
          {current.tag}
        </h1>
        <p
          className="text-white/35 font-light mt-2 su-fade-up su-d3"
          style={{ ...serif, fontSize: 'clamp(0.95rem, 1.5vw, 1.2rem)' }}
        >
          <em>{current.sub}</em>
        </p>
        <div className="h-px bg-white/15 mt-5 mb-4 su-slide-r su-d4" style={{ width: '3rem' }} />
        <p className="text-white/25 text-[0.8rem] leading-relaxed max-w-[240px] su-fade-up su-d5" style={serif}>
          {step === 0 ? 'Create your account. It takes less than a minute.' : 'Tell us a little about yourself — you can always change this later.'}
        </p>
      </div>

      {/* Marquee */}
      <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-white/[0.06] flex items-center overflow-hidden z-20">
        <div className="su-marquee flex whitespace-nowrap">
          {Array(6).fill('OUTFIT CHECK · VIRTUAL TRY-ON · VIRTROBE · YOUR DIGITAL WARDROBE · ').map((t,i)=>(
            <span key={i} className="text-white/15 text-[9px] tracking-[0.3em] uppercase px-6" style={serif}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Shared field component ────────────────────────────────────────────────────
const Field = ({ label, type = 'text', value, onChange, placeholder, autoComplete, hint, children, animClass = '' }) => (
  <div className={`flex flex-col gap-1 ${animClass}`}>
    <label className="text-[9px] text-black/35 uppercase tracking-[0.2em]" style={serif}>{label}</label>
    <div className="relative su-field border-b border-black/12">
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete}
        className="w-full bg-transparent py-2 text-black placeholder:text-black/18 outline-none"
        style={{ ...serif, fontSize: '0.95rem' }}
      />
      {children}
    </div>
    {hint && <p className="text-[9px] text-black/25 mt-0.5" style={serif}>{hint}</p>}
  </div>
);

// ── Avatar picker ─────────────────────────────────────────────────────────────
const AvatarPicker = ({ displayName, preview, onChange, onRemove }) => {
  const ref = useRef(null);
  const initials = displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex items-center gap-4 su-fade-up su-d0">
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-black/8 border border-black/12 flex items-center justify-center">
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <span className="text-xl font-light text-black/25" style={serif}>{initials}</span>
          }
        </div>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-black rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <Camera className="w-2.5 h-2.5 text-white" />
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </div>
      <div>
        <p className="text-[11px] font-light text-black/60" style={serif}>Profile photo</p>
        <p className="text-[9px] text-black/30 mt-0.5" style={serif}>Optional. JPG, PNG or WebP.</p>
        <div className="flex gap-3 mt-1.5">
          <button type="button" onClick={() => ref.current?.click()}
            className="text-[9px] text-black/40 hover:text-black transition-colors underline underline-offset-2" style={serif}>
            Upload
          </button>
          {preview && (
            <button type="button" onClick={onRemove}
              className="text-[9px] text-red-400 hover:text-red-600 transition-colors" style={serif}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SignUpPage
// ─────────────────────────────────────────────────────────────────────────────
const SignUpPage = ({ onSuccess, onSignIn }) => {
  const [step, setStep] = useState(0);

  // Step 1 — credentials
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConf,    setShowConf]    = useState(false);

  // Step 2 — profile
  const [displayName,  setDisplayName]  = useState('');
  const [username,     setUsername]     = useState('');
  const [bio,          setBio]          = useState('');
  const [location,     setLocation]     = useState('');
  const [websiteUrl,   setWebsiteUrl]   = useState('');
  const [avatarFile,   setAvatarFile]   = useState(null);
  const [avatarPreview,setAvatarPreview]= useState(null);

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [formKey,      setFormKey]      = useState(0);

  // Password strength
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)                    s++;
    if (/[A-Z]/.test(password))                  s++;
    if (/[0-9]/.test(password))                  s++;
    if (/[^A-Za-z0-9]/.test(password))           s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strength];

  // Auto-derive username from display name
  useEffect(() => {
    if (!username) {
      const derived = displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 24);
      if (derived) setUsername(derived);
    }
  }, [displayName]);

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  // ── Step 1 validation → advance ──────────────────────────────────────────
  const handleStep1 = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim())                          return setError('Email is required.');
    if (!password)                              return setError('Password is required.');
    if (password.length < 8)                    return setError('Password must be at least 8 characters.');
    if (password !== confirmPass)               return setError('Passwords don\'t match.');
    setFormKey(k => k + 1);
    setStep(1);
  };

  // ── Step 2 → create account ───────────────────────────────────────────────
  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) return setError('Display name is required.');
    if (!username.trim())    return setError('Username is required.');
    if (username.length < 3) return setError('Username must be at least 3 characters.');
    if (!/^[a-z0-9_]+$/.test(username)) return setError('Username can only contain lowercase letters, numbers and underscores.');

    setLoading(true);
    try {
      // 1. Create auth user (trigger auto-creates profiles row)
      const user = await authService.signUp({
        email:       email.trim(),
        password,
        username:    username.trim().toLowerCase(),
        displayName: displayName.trim(),
      });

      // 2. Upload avatar if provided (non-fatal)
      let avatarUrl = null;
      if (avatarFile && user?.id) {
        try {
          const ext  = avatarFile.name.split('.').pop();
          const path = `${user.id}/avatar.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
          if (!upErr) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(path);
            avatarUrl = data.publicUrl + `?t=${Date.now()}`;
          }
        } catch { /* non-fatal */ }
      }

      // 3. Upsert profile with full details (bio, location, website, avatar)
      const profilePayload = {
        id:           user.id,
        username:     username.trim().toLowerCase(),
        display_name: displayName.trim(),
        bio:          bio.trim()        || null,
        location:     location.trim()   || null,
        website_url:  websiteUrl.trim() || null,
        avatar_url:   avatarUrl,
      };

      const { error: profErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profErr) console.warn('Profile upsert error (non-fatal):', profErr.message);

      onSuccess?.(user);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="w-full h-screen flex bg-white overflow-hidden">

        {/* Left panel — updates on step change */}
        <LeftPanel step={step} />

        {/* Right panel */}
        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <div className="overflow-y-auto h-full flex flex-col justify-center px-10 lg:px-14 py-8">

            {/* Back button (step 2 only) */}
            {step === 1 && (
              <button
                onClick={() => { setStep(0); setFormKey(k=>k+1); setError(''); }}
                className="flex items-center gap-1.5 text-[10px] text-black/30 hover:text-black transition-colors mb-6 self-start su-fade-in"
                style={serif}
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
            )}

            {/* Heading */}
            <div className="mb-7 su-fade-up su-d0" key={`heading-${step}`}>
              <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-2" style={serif}>
                {step === 0 ? 'Create account · 1 of 2' : 'Your profile · 2 of 2'}
              </p>
              <h2 className="font-light text-black" style={{ ...serif, fontSize: '1.8rem', lineHeight: 1.05 }}>
                {step === 0 ? 'Welcome to Virtrobe.' : 'Now, tell us about yourself.'}
              </h2>
            </div>

            {/* ── STEP 1: credentials ───────────────────────────────────── */}
            {step === 0 && (
              <form key={`form-${formKey}`} onSubmit={handleStep1} className="flex flex-col gap-4">
                <Field
                  label="Email" type="email" value={email}
                  onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email"
                  animClass="su-fade-up su-d1"
                />
                <Field
                  label="Password" type={showPass ? 'text' : 'password'} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="Min. 8 characters" autoComplete="new-password"
                  animClass="su-fade-up su-d2"
                >
                  <button type="button" tabIndex={-1}
                    onClick={()=>setShowPass(v=>!v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/60 transition-colors">
                    {showPass ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
                  </button>
                </Field>

                {/* Password strength bar */}
                {password && (
                  <div className="su-fade-in su-d2">
                    <div className="flex gap-1 h-0.5 mb-1">
                      {[1,2,3,4].map(i=>(
                        <div key={i} className="flex-1 rounded-full transition-all duration-300"
                          style={{ background: strength >= i ? strengthColor : 'rgba(0,0,0,0.08)' }}/>
                      ))}
                    </div>
                    <p className="text-[9px]" style={{ ...serif, color: strengthColor }}>{strengthLabel}</p>
                  </div>
                )}

                <Field
                  label="Confirm password" type={showConf ? 'text' : 'password'} value={confirmPass}
                  onChange={e=>setConfirmPass(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password"
                  animClass="su-fade-up su-d3"
                >
                  <button type="button" tabIndex={-1}
                    onClick={()=>setShowConf(v=>!v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/60 transition-colors">
                    {showConf ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
                  </button>
                  {/* Match tick */}
                  {confirmPass && password === confirmPass && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <Check className="w-3 h-3 text-green-500"/>
                    </div>
                  )}
                </Field>

                {error && <p className="text-[10px] text-red-400 su-fade-in" style={serif}>{error}</p>}

                <button
                  type="submit"
                  className="w-full py-3 bg-black text-white flex items-center justify-center gap-2 hover:bg-black/80 transition-all active:scale-[0.98] su-fade-up su-d4 mt-2"
                  style={{ ...serif, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                >
                  Continue <ArrowRight className="w-3 h-3"/>
                </button>

                <p className="text-center text-[10px] text-black/25 su-fade-in su-d5 mt-1" style={serif}>
                  Already have an account?{' '}
                  <button type="button" onClick={onSignIn}
                    className="text-black underline underline-offset-2 hover:text-black/60 transition-colors">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* ── STEP 2: profile details ───────────────────────────────── */}
            {step === 1 && (
              <form key={`form2-${formKey}`} onSubmit={handleStep2} className="flex flex-col gap-4">

                <AvatarPicker
                  displayName={displayName}
                  preview={avatarPreview}
                  onChange={handleAvatarChange}
                  onRemove={()=>{ setAvatarFile(null); setAvatarPreview(null); }}
                />

                <Field
                  label="Display name" value={displayName}
                  onChange={e=>setDisplayName(e.target.value)}
                  placeholder="How others see you" autoComplete="name"
                  animClass="su-fade-up su-d1"
                />

                <Field
                  label="Username" value={username}
                  onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}
                  placeholder="your_handle" autoComplete="username"
                  hint="Letters, numbers and underscores only."
                  animClass="su-fade-up su-d2"
                >
                  {/* Prefix */}
                  <span className="absolute left-0 top-2 text-black/25 pointer-events-none"
                    style={{ ...serif, fontSize: '0.95rem' }}>@</span>
                  <input
                    value={username}
                    onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}
                    placeholder="your_handle"
                    className="w-full bg-transparent py-2 pl-4 text-black placeholder:text-black/18 outline-none"
                    style={{ ...serif, fontSize: '0.95rem' }}
                  />
                </Field>

                {/* Bio */}
                <div className="su-fade-up su-d3">
                  <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5" style={serif}>Bio <span className="text-black/20 normal-case">(optional)</span></label>
                  <div className="su-field border-b border-black/12">
                    <textarea
                      value={bio}
                      onChange={e=>setBio(e.target.value)}
                      placeholder="Tell the world about your style…"
                      rows={2}
                      maxLength={200}
                      className="w-full bg-transparent py-2 text-black placeholder:text-black/18 outline-none resize-none"
                      style={{ ...serif, fontSize: '0.95rem' }}
                    />
                  </div>
                  <p className="text-[8px] text-black/20 text-right mt-0.5">{bio.length}/200</p>
                </div>

                <Field
                  label="Location" value={location}
                  onChange={e=>setLocation(e.target.value)}
                  placeholder="City, Country" autoComplete="country-name"
                  animClass="su-fade-up su-d4"
                />

                <Field
                  label="Website" type="url" value={websiteUrl}
                  onChange={e=>setWebsiteUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  animClass="su-fade-up su-d4"
                />

                {error && <p className="text-[10px] text-red-400 su-fade-in" style={serif}>{error}</p>}

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-black text-white flex items-center justify-center gap-2 hover:bg-black/80 disabled:opacity-40 transition-all active:scale-[0.98] su-fade-up su-d5 mt-1"
                  style={{ ...serif, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                    : <><Check className="w-3 h-3"/>Create my account</>
                  }
                </button>

                <p className="text-center text-[9px] text-black/18 leading-relaxed su-fade-in su-d6" style={serif}>
                  By creating an account you agree to our{' '}
                  <span className="underline underline-offset-2 cursor-pointer hover:text-black/40 transition-colors">Terms</span>
                  {' '}and{' '}
                  <span className="underline underline-offset-2 cursor-pointer hover:text-black/40 transition-colors">Privacy Policy</span>.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUpPage;