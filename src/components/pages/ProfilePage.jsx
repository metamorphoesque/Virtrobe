// src/components/pages/ProfilePage.jsx
// Receives initialProfile from App.jsx (already fetched) so there's no
// double-fetch flicker. Calls onProfileUpdate after edits so the nav
// avatar/display name updates immediately.

import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin, Link2, Edit3, Trash2, Globe, Lock,
  Camera, X, Check, Loader2, Calendar, Grid2x2,
  LayoutGrid, ChevronLeft, ChevronRight, ImageOff
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const fmt = (iso, opts) => iso ? new Date(iso).toLocaleDateString('en-GB', opts) : '';
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const daysInMonth  = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const isSameDay    = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// ─────────────────────────────────────────────────────────────────────────────
// Outfit thumbnail card
// ─────────────────────────────────────────────────────────────────────────────
const OutfitThumb = ({ outfit, size = 'md', onDelete, onTogglePublic, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgErr,   setImgErr]   = useState(false);
  const sizeClasses = { sm: 'aspect-[3/4] rounded-lg', md: 'aspect-[3/4] rounded-xl', lg: 'aspect-[3/4] rounded-2xl' };

  return (
    <div
      className={`group relative overflow-hidden bg-black/[0.04] border border-black/6 hover:border-black/20 transition-all duration-200 cursor-pointer ${sizeClasses[size]}`}
      onClick={() => onClick?.(outfit)}
    >
      {outfit.screenshotSignedUrl && !imgErr ? (
        <img src={outfit.screenshotSignedUrl} alt={outfit.name}
          onError={() => setImgErr(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable={false} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-15">
          <ImageOff className="w-5 h-5 text-black" />
          <span className="text-[8px] text-black uppercase tracking-widest">No preview</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200" />
      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-white text-[10px] font-medium truncate leading-tight" style={serif}>{outfit.name}</p>
        <p className="text-white/50 text-[8px]">{fmt(outfit.saved_at, { day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="absolute top-1.5 left-1.5">
        {outfit.is_public ? <Globe className="w-2.5 h-2.5 text-white drop-shadow" /> : <Lock className="w-2.5 h-2.5 text-white/60 drop-shadow" />}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <span className="text-white text-[10px] leading-none">···</span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div className="absolute top-7 right-1.5 z-20 bg-white rounded-xl shadow-xl border border-black/8 py-1 w-36 overflow-hidden">
            <button onClick={(e) => { e.stopPropagation(); onTogglePublic?.(outfit.id, !outfit.is_public); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-[10px] text-black/60 hover:bg-black/5 hover:text-black transition-colors flex items-center gap-2">
              {outfit.is_public ? <><Lock className="w-3 h-3" />Make private</> : <><Globe className="w-3 h-3" />Make public</>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(outfit.id); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-[10px] text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
              <Trash2 className="w-3 h-3" />Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Calendar grid
// ─────────────────────────────────────────────────────────────────────────────
const VIEWS = ['day', 'week', 'month'];
const VIEW_ICONS  = { day: Calendar, week: Grid2x2, month: LayoutGrid };
const VIEW_LABELS = { day: 'Day', week: 'Week', month: 'Month' };

const CalendarGrid = ({ outfits, onDelete, onTogglePublic, onClickOutfit }) => {
  const [view,   setView]   = useState('month');
  const [cursor, setCursor] = useState(new Date());

  const byDate = outfits.reduce((acc, o) => {
    if (!o.saved_at) return acc;
    const key = new Date(o.saved_at).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const DayView = () => {
    const dayOutfits = byDate[cursor.toDateString()] ?? [];
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCursor((d) => { const n = new Date(d); n.setDate(n.getDate()-1); return n; })}
            className="p-2 rounded-xl hover:bg-black/5 text-black/30 hover:text-black transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-center">
            <p className="text-2xl font-light text-black" style={serif}>{fmt(cursor.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-[10px] text-black/25 mt-0.5">{dayOutfits.length} outfit{dayOutfits.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setCursor((d) => { const n = new Date(d); n.setDate(n.getDate()+1); return n; })}
            className="p-2 rounded-xl hover:bg-black/5 text-black/30 hover:text-black transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {dayOutfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 opacity-25 select-none">
            <Calendar className="w-10 h-10 text-black/20 mb-3" strokeWidth={1} />
            <p className="text-[12px] text-black/30" style={serif}>Nothing saved this day</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {dayOutfits.map((o) => <OutfitThumb key={o.id} outfit={o} size="lg" onDelete={onDelete} onTogglePublic={onTogglePublic} onClick={onClickOutfit} />)}
          </div>
        )}
      </div>
    );
  };

  const WeekView = () => {
    const weekStart = new Date(cursor);
    const diff = cursor.getDay() === 0 ? -6 : 1 - cursor.getDay();
    weekStart.setDate(cursor.getDate() + diff);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCursor((d) => { const n = new Date(d); n.setDate(n.getDate()-7); return n; })}
            className="p-2 rounded-xl hover:bg-black/5 text-black/30 hover:text-black transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-lg font-light text-black" style={serif}>
            {fmt(days[0].toISOString(), { day: 'numeric', month: 'short' })} – {fmt(days[6].toISOString(), { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <button onClick={() => setCursor((d) => { const n = new Date(d); n.setDate(n.getDate()+7); return n; })}
            className="p-2 rounded-xl hover:bg-black/5 text-black/30 hover:text-black transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="text-center text-[9px] text-black/25 uppercase tracking-widest pb-2">{d}</div>
          ))}
          {days.map((d, i) => {
            const dayOutfits = byDate[d.toDateString()] ?? [];
            const isToday = isSameDay(d, new Date());
            return (
              <div key={i} onClick={() => { setCursor(d); setView('day'); }} className="cursor-pointer group">
                <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${isToday ? 'border-black/30' : 'border-black/6 hover:border-black/20'}`}>
                  <div className={`px-2 pt-2 pb-1 flex items-center justify-between ${isToday ? 'bg-black' : ''}`}>
                    <span className={`text-[10px] font-medium ${isToday ? 'text-white' : 'text-black/40'}`}>{d.getDate()}</span>
                    {dayOutfits.length > 0 && <span className={`text-[8px] tabular-nums ${isToday ? 'text-white/50' : 'text-black/25'}`}>{dayOutfits.length}</span>}
                  </div>
                  <div className="p-1 space-y-1">
                    {dayOutfits.slice(0, 2).map((o) => (
                      <div key={o.id} className="aspect-[3/4] rounded-lg overflow-hidden bg-black/[0.04]">
                        {o.screenshotSignedUrl ? <img src={o.screenshotSignedUrl} alt={o.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/[0.06]" />}
                      </div>
                    ))}
                    {dayOutfits.length > 2 && <div className="aspect-[3/4] rounded-lg bg-black/5 flex items-center justify-center"><span className="text-[9px] text-black/35">+{dayOutfits.length - 2}</span></div>}
                    {dayOutfits.length === 0 && <div className="h-8" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const first   = startOfMonth(cursor);
    const total   = daysInMonth(cursor);
    const startDow = (first.getDay() + 6) % 7;
    const cells   = Array.from({ length: startDow + total }, (_, i) => {
      if (i < startDow) return null;
      return new Date(cursor.getFullYear(), cursor.getMonth(), i - startDow + 1);
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth()-1, 1))}
            className="p-2 rounded-xl hover:bg-black/5 text-black/30 hover:text-black transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-xl font-light text-black" style={serif}>{fmt(cursor.toISOString(), { month: 'long', year: 'numeric' })}</p>
          <button onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth()+1, 1))}
            className="p-2 rounded-xl hover:bg-black/5 text-black/30 hover:text-black transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="text-center text-[9px] text-black/20 uppercase tracking-widest pb-1.5">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const dayOutfits = byDate[d.toDateString()] ?? [];
            const isToday    = isSameDay(d, new Date());
            return (
              <div key={d.toDateString()} onClick={() => { setCursor(d); setView('day'); }} className="cursor-pointer group">
                <div className={`rounded-xl border overflow-hidden transition-all duration-150 ${isToday ? 'border-black/40' : 'border-black/5 hover:border-black/15'} ${dayOutfits.length > 0 ? 'shadow-sm' : ''}`}>
                  <div className={`px-1.5 pt-1.5 pb-1 flex justify-between items-center ${isToday ? 'bg-black' : ''}`}>
                    <span className={`text-[9px] font-medium ${isToday ? 'text-white' : 'text-black/35'}`}>{d.getDate()}</span>
                    {dayOutfits.length > 0 && <span className={`text-[7px] ${isToday ? 'text-white/50' : 'text-black/20'}`}>{dayOutfits.length}</span>}
                  </div>
                  <div className="px-1 pb-1">
                    {dayOutfits[0] ? (
                      <div className="aspect-[3/4] rounded-lg overflow-hidden">
                        {dayOutfits[0].screenshotSignedUrl ? <img src={dayOutfits[0].screenshotSignedUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-black/[0.06]" />}
                      </div>
                    ) : <div className="aspect-[3/4]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.35em] mb-1" style={serif}>Archive</p>
          <h3 className="text-xl font-light text-black" style={serif}>Saved designs</h3>
        </div>
        <div className="flex items-center gap-1 bg-black/[0.04] rounded-xl p-1">
          {VIEWS.map((v) => {
            const Icon = VIEW_ICONS[v];
            return (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${view === v ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'}`}>
                <Icon className="w-3 h-3" />{VIEW_LABELS[v]}
              </button>
            );
          })}
        </div>
      </div>
      {view === 'day'   && <DayView />}
      {view === 'week'  && <WeekView />}
      {view === 'month' && <MonthView />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Edit Profile Modal
// ─────────────────────────────────────────────────────────────────────────────
const EditProfileModal = ({ profile, onSave, onClose, saving, error, onUploadAvatar, onRemoveAvatar }) => {
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    username:     profile?.username     ?? '',
    bio:          profile?.bio          ?? '',
    location:     profile?.location     ?? '',
    website_url:  profile?.website_url  ?? '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (avatarFile) await onUploadAvatar(avatarFile);
    await onSave(form);
  };

  const Field = ({ label, value, onChange, placeholder, type = 'text', multiline = false }) => (
    <div>
      <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5" style={serif}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
          className="w-full border-b border-black/12 focus:border-black bg-transparent py-2 text-black placeholder:text-black/20 outline-none transition-colors resize-none text-[13px]"
          style={serif} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          className="w-full border-b border-black/12 focus:border-black bg-transparent py-2 text-black placeholder:text-black/20 outline-none transition-colors text-[13px]"
          style={serif} />
      )}
    </div>
  );

  const avatarSrc = avatarPreview ?? profile?.avatar_url;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-black/6">
          <div>
            <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-1" style={serif}>Account</p>
            <h2 className="text-2xl font-light text-black" style={serif}>Edit profile</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-black/8 border border-black/10">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-light text-black/25" style={serif}>{form.display_name?.[0]?.toUpperCase() ?? '?'}</span>
                    </div>
                }
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                <Camera className="w-3 h-3 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-black">Profile photo</p>
              <p className="text-[10px] text-black/35 mt-0.5">JPG, PNG or WebP. Max 5MB.</p>
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="text-[10px] text-black/50 hover:text-black transition-colors underline underline-offset-2">Change</button>
                {avatarSrc && (
                  <button type="button" onClick={() => { onRemoveAvatar(); setAvatarPreview(null); }}
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors">Remove</button>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-black/6" />
          <Field label="Display name"   value={form.display_name} onChange={set('display_name')} placeholder="Your name" />
          <Field label="Username"       value={form.username}     onChange={set('username')}     placeholder="your_handle" />
          <Field label="Bio"            value={form.bio}          onChange={set('bio')}          placeholder="Tell the world about your style…" multiline />
          <Field label="Location"       value={form.location}     onChange={set('location')}     placeholder="City, Country" />
          <Field label="Website / link" value={form.website_url}  onChange={set('website_url')}  placeholder="https://yoursite.com" type="url" />

          {error && <p className="text-[10px] text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-black/10 text-[11px] text-black/50 hover:border-black/25 hover:text-black transition-all"
              style={{ ...serif, letterSpacing: '0.1em' }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-black text-white text-[11px] flex items-center justify-center gap-2 hover:bg-black/80 disabled:opacity-30 transition-all"
              style={{ ...serif, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" />Save changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage
// ─────────────────────────────────────────────────────────────────────────────
const ProfilePage = ({ currentUser, onOpenAuth, initialProfile, onProfileUpdate }) => {
  const userId = currentUser?.id ?? null;

  const {
    profile: fetchedProfile, outfits, loading, saving, error,
    updateProfile, uploadAvatar, removeAvatar, deleteOutfit, toggleOutfitVisibility,
  } = useProfile(userId);

  // Use initialProfile as the starting point (avoids flash), then defer to fetched
  const profile = fetchedProfile ?? initialProfile ?? null;

  const [editOpen,    setEditOpen]    = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center mb-4">
          <span className="text-2xl">👤</span>
        </div>
        <h2 className="text-2xl font-light text-black mb-2" style={serif}>Sign in to view your profile</h2>
        <p className="text-[12px] text-black/35 mb-6">Your saved looks, wardrobe archive, and style history live here.</p>
        <button onClick={onOpenAuth}
          className="px-6 py-3 bg-black text-white text-[11px] hover:bg-black/80 transition-colors"
          style={{ ...serif, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Sign in
        </button>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
      </div>
    );
  }

  const handleSave = async (fields) => {
    const updated = await updateProfile(fields);
    setEditOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    // Bubble updated profile up to App so nav display name/avatar refreshes
    onProfileUpdate?.(updated);
  };

  const handleAvatarUpload = async (file) => {
    const url = await uploadAvatar(file);
    onProfileUpdate?.(profile ? { ...profile, avatar_url: url } : null);
  };

  const initials = (profile?.display_name ?? profile?.username ?? currentUser?.email ?? '?')[0].toUpperCase();

  return (
    <>
      {editOpen && (
        <EditProfileModal
          profile={profile}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
          saving={saving}
          error={error}
          onUploadAvatar={handleAvatarUpload}
          onRemoveAvatar={removeAvatar}
        />
      )}

      <div className="max-w-5xl mx-auto">
        {/* ── Profile header ── */}
        <div className="flex items-start gap-7 mb-10 pt-2">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-black/8 border border-black/10 shadow-sm">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-light text-black/25" style={serif}>{initials}</span>
                  </div>
              }
            </div>
            {saveSuccess && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-light text-black leading-tight" style={serif}>
                  {profile?.display_name ?? 'Anonymous'}
                </h1>
                <p className="text-[12px] text-black/35 mt-0.5">
                  @{profile?.username ?? currentUser?.email?.split('@')[0] ?? '—'}
                </p>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-black/12 rounded-xl text-[10px] text-black/50 hover:border-black/30 hover:text-black transition-all mt-1"
              >
                <Edit3 className="w-3 h-3" />
                Edit profile
              </button>
            </div>

            {profile?.bio && (
              <p className="text-[13px] text-black/55 leading-relaxed mt-3 max-w-lg" style={serif}>{profile.bio}</p>
            )}

            <div className="flex items-center flex-wrap gap-4 mt-3">
              {profile?.location && (
                <span className="flex items-center gap-1.5 text-[11px] text-black/35">
                  <MapPin className="w-3 h-3" />{profile.location}
                </span>
              )}
              {profile?.website_url && (
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-black/50 hover:text-black transition-colors">
                  <Link2 className="w-3 h-3" />
                  {profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              <span className="text-[11px] text-black/25">
                {outfits.length} saved look{outfits.length !== 1 ? 's' : ''}
              </span>
              {profile?.created_at && (
                <span className="text-[11px] text-black/25">
                  Joined {fmt(profile.created_at, { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-black/6 mb-10" />

        {outfits.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30 select-none">
            <div className="text-5xl mb-4">🎽</div>
            <p className="text-lg font-light text-black/40" style={serif}>No saved designs yet</p>
            <p className="text-[11px] text-black/25 mt-1">Save an outfit from the Try On page to start your archive.</p>
          </div>
        ) : (
          <CalendarGrid
            outfits={outfits}
            onDelete={deleteOutfit}
            onTogglePublic={toggleOutfitVisibility}
            onClickOutfit={(outfit) => console.log('open outfit modal', outfit.id)}
          />
        )}
      </div>
    </>
  );
};

export default ProfilePage;