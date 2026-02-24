// src/components/pages/AuthPage.jsx
// 60/40 split login & signup page — editorial minimalist, white + black.
// Wire up authService.signIn / signUp / signInWithGoogle when ready.

import React from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import authService from '../../services/authService';

// ---------------------------------------------------------------------------
// Google wordmark SVG (no external dependency)
// ---------------------------------------------------------------------------
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Animated editorial left panel — fashion editorial feel with typography
// ---------------------------------------------------------------------------
const LeftPanel = () => {
  return (
    <div className="relative w-[60%] h-full bg-black overflow-hidden flex-shrink-0">
      {/* Background texture — fine grain noise via SVG filter */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)"/>
      </svg>

      {/* Geometric accent lines */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Thin horizontal rule — upper third */}
        <div className="absolute top-[30%] left-12 right-12 h-px bg-white/8" />
        {/* Thin vertical rule — right side */}
        <div className="absolute top-12 bottom-12 right-[38%] w-px bg-white/5" />
        {/* Large circle — partially visible */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/5" />
      </div>

      {/* Logo top-left */}
      <div className="absolute top-10 left-10 z-10">
        <span
          className="text-white text-sm font-light tracking-[0.3em] uppercase"
          style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
        >
          Virtrobe
        </span>
      </div>

      {/* Central editorial text */}
      <div className="absolute inset-0 flex flex-col justify-end p-10 pb-14 z-10">
        <div className="mb-6">
          <p className="text-white/30 text-[10px] tracking-[0.4em] uppercase mb-4">
            Your digital wardrobe
          </p>
          <h1
            className="text-white font-light leading-[1.05]"
            style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
            }}
          >
            Style is a form<br />
            of <em>self-expression</em>.
          </h1>
        </div>

        <div className="h-px w-12 bg-white/20 mb-5" />

        <p
          className="text-white/40 text-xs leading-relaxed max-w-xs"
          style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '0.85rem' }}
        >
          Try on any garment on your personalised 3D silhouette.
          Curate looks. Share with the world.
        </p>
      </div>

      {/* Floating editorial number tag — top right of panel */}
      <div className="absolute top-10 right-10 z-10 flex flex-col items-end gap-1">
        <span className="text-white/15 text-[10px] tracking-widest uppercase">Est.</span>
        <span
          className="text-white/20 text-4xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
        >
          2025
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Input field
// ---------------------------------------------------------------------------
const Field = ({ label, type = 'text', value, onChange, placeholder, autoComplete, children }) => (
  <div className="flex flex-col gap-1.5">
    <label
      className="text-[10px] text-black/40 uppercase tracking-[0.15em]"
      style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
    >
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full border-b border-black/15 focus:border-black bg-transparent py-2.5 text-sm text-black placeholder:text-black/20 outline-none transition-colors duration-200"
        style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1rem' }}
      />
      {children}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// AuthPage
// ---------------------------------------------------------------------------
const AuthPage = ({ onAuthSuccess }) => {
  const [mode, setMode] = React.useState('login'); // 'login' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const isLogin = mode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const user = await authService.signIn({ email, password });
        onAuthSuccess?.(user);
      } else {
        const user = await authService.signUp({ email, password, username, displayName });
        onAuthSuccess?.(user);
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    // OAuth wired to Supabase — enable Google provider in Supabase dashboard first
    try {
      await authService.signInWithGoogle?.();
    } catch (err) {
      setError('Google sign-in is not configured yet.');
    }
  };

  return (
    <div className="w-full h-screen flex bg-white overflow-hidden">

      {/* ── Left: editorial panel (60%) ── */}
      <LeftPanel />

      {/* ── Right: auth form (40%) ── */}
      <div className="flex-1 flex flex-col justify-center px-12 lg:px-16 xl:px-20 overflow-y-auto">

        {/* Mode toggle tabs */}
        <div className="flex gap-6 mb-12">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`text-sm pb-2 border-b-2 transition-all duration-200 capitalize tracking-wide ${
                mode === m
                  ? 'border-black text-black'
                  : 'border-transparent text-black/25 hover:text-black/50'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '1.1rem' }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Sign-up only fields */}
          {!isLogin && (
            <>
              <Field
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear to others"
                autoComplete="name"
              />
              <Field
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_handle"
                autoComplete="username"
              />
            </>
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Field
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          >
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/60 transition-colors"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </Field>

          {/* Forgot password */}
          {isLogin && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                className="text-[11px] text-black/30 hover:text-black transition-colors tracking-wide"
                style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-500 text-[11px] leading-relaxed -mt-2">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 bg-black text-white text-sm tracking-widest uppercase transition-all duration-200 hover:bg-black/80 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
            style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontSize: '0.75rem', letterSpacing: '0.2em' }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign in' : 'Create account'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-black/8" />
          <span
            className="text-[10px] text-black/25 tracking-[0.2em] uppercase"
            style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
          >
            or
          </span>
          <div className="flex-1 h-px bg-black/8" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          type="button"
          className="flex items-center justify-center gap-3 w-full py-3 border border-black/12 text-black/60 text-sm hover:border-black/30 hover:text-black transition-all duration-200 active:scale-[0.98]"
          style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif', fontSize: '0.95rem'" }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Switch mode */}
        <p
          className="mt-8 text-center text-[11px] text-black/30"
          style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
        >
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError(''); }}
            className="text-black underline underline-offset-2 hover:text-black/70 transition-colors"
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>

        {/* Legal */}
        <p
          className="mt-6 text-center text-[10px] text-black/20 leading-relaxed"
          style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif" }}
        >
          By continuing you agree to our{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-black/40 transition-colors">Terms</span>
          {' '}and{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-black/40 transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;