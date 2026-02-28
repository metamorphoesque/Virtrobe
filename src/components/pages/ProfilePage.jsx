// src/components/pages/ProfilePage.jsx
// Same design/structure as the provided version.
// Mock data removed — driven by useProfile(currentUser.id) via Supabase.
// Receives initialProfile + onProfileUpdate from App.jsx to keep nav in sync.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapPin, Link2, Edit3, Trash2, Globe, Lock,
  Camera, X, Check, Loader2, ImageOff,
  UserPlus, Settings, Search, UserCheck, Users,
  Calendar, CalendarDays, LayoutGrid, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../services/authService';
import OutfitModal from '../ui/OutfitModal';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const mono  = { fontFamily: "'DM Mono', 'Courier New', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate  = (iso) => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); };
const getYear  = (iso) => iso ? new Date(iso).getFullYear() : null;
const fmtCount = (n)   => { if (!n) return '0'; if (n >= 1000) return (n/1000).toFixed(1).replace('.0','')+'k'; return String(n); };

const isLight = (hex = '#888') => {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return (r*299+g*587+b*114)/1000 > 155;
};

const weekStart = (d) => { const day = new Date(d); const diff=(day.getDay()+6)%7; day.setDate(day.getDate()-diff); day.setHours(0,0,0,0); return day; };
const isoDate   = (d) => d.toISOString().slice(0,10);

const groupByWeek  = (outfits) => { const map={}; outfits.forEach(o=>{ const k=isoDate(weekStart(new Date(o.saved_at))); if(!map[k]) map[k]=[]; map[k].push(o); }); return Object.entries(map).sort(([a],[b])=>b.localeCompare(a)).map(([weekKey,items])=>({weekKey,items})); };
const groupByMonth = (outfits) => { const map={}; outfits.forEach(o=>{ const k=o.saved_at.slice(0,7); if(!map[k]) map[k]=[]; map[k].push(o); }); return Object.entries(map).sort(([a],[b])=>b.localeCompare(a)).map(([monthKey,items])=>({monthKey,items})); };

const VIEW_MODES  = [
  { id:'single', label:'Day',   Icon:Calendar,     tip:'One look at a time' },
  { id:'week',   label:'Week',  Icon:CalendarDays, tip:'7-day grid'         },
  { id:'month',  label:'Month', Icon:LayoutGrid,   tip:'Full calendar month' },
];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─────────────────────────────────────────────────────────────────────────────
// LookCard
// ─────────────────────────────────────────────────────────────────────────────
const LookCard = ({ outfit, size='md', onDelete, onTogglePublic, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgErr,   setImgErr]   = useState(false);
  const light = isLight(outfit.dominantColor ?? '#888');
  const radius = { lg:'rounded-2xl', md:'rounded-xl', sm:'rounded-lg' }[size] ?? 'rounded-xl';

  return (
    <div className="group relative flex flex-col cursor-pointer" onClick={() => onClick?.(outfit)}>
      <div
        className={`relative overflow-hidden border border-black/8 hover:border-black/25 transition-all duration-300 shadow-sm hover:shadow-lg ${radius}`}
        style={{ background: outfit.dominantColor ?? '#f0ede8', aspectRatio:'3/4' }}
      >
        {outfit.screenshotSignedUrl && !imgErr ? (
          <img src={outfit.screenshotSignedUrl} alt={outfit.name} onError={()=>setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" draggable={false}/>
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <svg viewBox="0 0 60 100" className={`opacity-20 ${size==='sm'?'w-6':size==='lg'?'w-20':'w-10'}`} fill="white">
              <circle cx="30" cy="14" r="10"/>
              <path d="M14 30 Q14 24 30 24 Q46 24 46 30 L50 70 Q50 72 48 72 L38 72 L36 100 L24 100 L22 72 L12 72 Q10 72 10 70 Z"/>
            </svg>
          </div>
        )}

        {/* Date badge */}
        <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md backdrop-blur-sm"
          style={{ background: light?'rgba(0,0,0,0.22)':'rgba(255,255,255,0.22)' }}>
          <span style={{ ...mono, fontSize:size==='sm'?7:9, color:light?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.75)', letterSpacing:'0.04em', lineHeight:1, display:'block' }}>
            {fmtDate(outfit.saved_at)}
          </span>
        </div>

        {size !== 'sm' && (
          <div className="absolute top-2.5 right-2 z-10">
            {outfit.is_public?<Globe className="w-2.5 h-2.5 text-white/50 drop-shadow-sm"/>:<Lock className="w-2.5 h-2.5 text-white/30 drop-shadow-sm"/>}
          </div>
        )}

        {size !== 'sm' && (
          <button onClick={(e)=>{e.stopPropagation();setMenuOpen(v=>!v);}}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] leading-none z-20">
            ···
          </button>
        )}

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={(e)=>{e.stopPropagation();setMenuOpen(false);}}/>
            <div className="absolute top-8 right-2 z-30 bg-white rounded-xl shadow-xl border border-black/8 py-1 w-36 overflow-hidden">
              <button onClick={(e)=>{e.stopPropagation();onTogglePublic?.(outfit.id,!outfit.is_public);setMenuOpen(false);}}
                className="w-full text-left px-3 py-2 text-[10px] text-black/60 hover:bg-black/5 hover:text-black transition-colors flex items-center gap-2">
                {outfit.is_public?<><Lock className="w-3 h-3"/>Make private</>:<><Globe className="w-3 h-3"/>Make public</>}
              </button>
              <button onClick={(e)=>{e.stopPropagation();onDelete?.(outfit.id);setMenuOpen(false);}}
                className="w-full text-left px-3 py-2 text-[10px] text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                <Trash2 className="w-3 h-3"/>Delete
              </button>
            </div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent"/>
        {size !== 'sm' && (
          <div className="absolute bottom-2 left-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <p className="text-white truncate leading-tight" style={{...serif,fontSize:size==='lg'?13:10}}>{outfit.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptySlot = ({ label, size='md' }) => (
  <div className={`relative border border-dashed border-black/8 bg-black/[0.015] flex items-center justify-center ${size==='sm'?'rounded-md':size==='lg'?'rounded-2xl':'rounded-xl'}`}
    style={{aspectRatio:'3/4'}}>
    {size!=='sm'&&label&&<span className="text-[8px] text-black/12 select-none" style={mono}>{label}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Day / Week / Month views (unchanged from provided version)
// ─────────────────────────────────────────────────────────────────────────────
const DayView = ({ outfits, onDelete, onTogglePublic, onClickOutfit }) => {
  const [idx,setIdx]=useState(0);
  const outfit=outfits[idx];
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-between w-full max-w-xs">
        <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}
          className="w-8 h-8 rounded-full border border-black/12 flex items-center justify-center text-black/30 hover:text-black hover:border-black/30 disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4"/></button>
        <div className="text-center">
          <p className="text-[9px] text-black/25 uppercase tracking-[0.3em]" style={serif}>{idx+1} of {outfits.length}</p>
          <p className="text-[11px] text-black/40 mt-0.5" style={mono}>{fmtDate(outfit?.saved_at)}</p>
        </div>
        <button onClick={()=>setIdx(i=>Math.min(outfits.length-1,i+1))} disabled={idx===outfits.length-1}
          className="w-8 h-8 rounded-full border border-black/12 flex items-center justify-center text-black/30 hover:text-black hover:border-black/30 disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4"/></button>
      </div>
      <div className="w-full max-w-[220px]">
        {outfit?<LookCard outfit={outfit} size="lg" onDelete={onDelete} onTogglePublic={onTogglePublic} onClick={onClickOutfit}/>:<EmptySlot label="No look" size="lg"/>}
      </div>
      {outfit&&<p className="text-base font-light text-black/55 text-center" style={serif}>{outfit.name}</p>}
    </div>
  );
};

const WeekSection = ({ weekKey, items, onDelete, onTogglePublic, onClickOutfit }) => {
  const weekBegin=new Date(weekKey);
  const slots=DAY_LABELS.map((dayLabel,i)=>{ const s=new Date(weekBegin); s.setDate(s.getDate()+i); const sk=isoDate(s); const outfit=items.find(o=>o.saved_at.slice(0,10)===sk)??null; return{dayLabel,slotKey:sk,outfit}; });
  const weekEnd=new Date(weekBegin); weekEnd.setDate(weekEnd.getDate()+6);
  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-[9px] text-black/20 uppercase tracking-[0.35em] flex-shrink-0" style={mono}>{fmtDate(weekBegin.toISOString())} – {fmtDate(weekEnd.toISOString())}</span>
        <div className="flex-1 h-px bg-black/6"/>
        <span className="text-[9px] text-black/15 flex-shrink-0" style={serif}>{items.length} look{items.length!==1?'s':''}</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {slots.map(({dayLabel,slotKey,outfit})=>(
          <div key={slotKey} className="flex flex-col gap-1.5">
            <span className="text-[8px] text-black/18 uppercase tracking-wide text-center block" style={mono}>{dayLabel}</span>
            {outfit?<LookCard outfit={outfit} size="md" onDelete={onDelete} onTogglePublic={onTogglePublic} onClick={onClickOutfit}/>:<EmptySlot size="md"/>}
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthSection = ({ monthKey, items, onDelete, onTogglePublic, onClickOutfit }) => {
  const [year,month]=monthKey.split('-').map(Number);
  const firstDay=new Date(year,month-1,1);
  const daysInMonth=new Date(year,month,0).getDate();
  const startOffset=(firstDay.getDay()+6)%7;
  const cells=Array.from({length:startOffset+daysInMonth},(_,i)=>{ if(i<startOffset) return null; const day=i-startOffset+1; const dateStr=`${monthKey}-${String(day).padStart(2,'0')}`; const outfit=items.find(o=>o.saved_at.slice(0,10)===dateStr)??null; return{day,dateStr,outfit}; });
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-5">
        <span className="text-[1.6rem] font-light text-black/10 leading-none flex-shrink-0 select-none" style={serif}>{new Date(year,month-1).toLocaleDateString('en-GB',{month:'long'})}</span>
        <div className="flex-1 h-px bg-black/6"/>
        <span className="text-[9px] text-black/20 uppercase tracking-[0.3em] flex-shrink-0" style={serif}>{year} · {items.length} look{items.length!==1?'s':''}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">{DAY_LABELS.map(d=><div key={d} className="text-center"><span className="text-[7px] text-black/15 uppercase tracking-wide" style={mono}>{d}</span></div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell,i)=>cell===null?<div key={`pad-${i}`}/>:(
          <div key={cell.dateStr} className="flex flex-col gap-0.5">
            {cell.outfit?<LookCard outfit={cell.outfit} size="sm" onDelete={onDelete} onTogglePublic={onTogglePublic} onClick={onClickOutfit}/>:<EmptySlot size="sm"/>}
            <span className="text-center text-[7px] text-black/15" style={mono}>{cell.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LooksArchive = ({ outfits, onDelete, onTogglePublic, onClickOutfit }) => {
  const [viewMode,setViewMode]=useState('week');
  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.4em] mb-1" style={serif}>Archive</p>
          <h2 className="text-xl font-light text-black" style={serif}>Saved looks</h2>
        </div>
        <div className="flex items-center gap-0.5 bg-black/[0.04] rounded-xl p-1">
          {VIEW_MODES.map(({id,label,Icon,tip})=>(
            <button key={id} onClick={()=>setViewMode(id)} title={tip}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] transition-all ${viewMode===id?'bg-white text-black shadow-sm border border-black/6':'text-black/35 hover:text-black/60'}`} style={serif}>
              <Icon className="w-3 h-3"/>{label}
            </button>
          ))}
        </div>
      </div>
      {viewMode==='single'&&<DayView outfits={outfits} onDelete={onDelete} onTogglePublic={onTogglePublic} onClickOutfit={onClickOutfit}/>}
      {viewMode==='week'&&groupByWeek(outfits).map(({weekKey,items})=><WeekSection key={weekKey} weekKey={weekKey} items={items} onDelete={onDelete} onTogglePublic={onTogglePublic} onClickOutfit={onClickOutfit}/>)}
      {viewMode==='month'&&groupByMonth(outfits).map(({monthKey,items})=><MonthSection key={monthKey} monthKey={monthKey} items={items} onDelete={onDelete} onTogglePublic={onTogglePublic} onClickOutfit={onClickOutfit}/>)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PeopleModal — real follower/following lists from Supabase
// ─────────────────────────────────────────────────────────────────────────────
const PeopleModal = ({ mode, profileId, currentUserId, onClose, followersCount, followingCount }) => {
  const [tab,       setTab]       = useState(mode);
  const [query,     setQuery]     = useState('');
  const [people,    setPeople]    = useState([]);
  const [loadingP,  setLoadingP]  = useState(true);
  const [myFollows, setMyFollows] = useState(new Set());

  useEffect(()=>{ const h=(e)=>{if(e.key==='Escape')onClose();}; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[onClose]);

  useEffect(() => {
    setLoadingP(true);
    const fetchPeople = async () => {
      if (tab === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('follower:follower_id(id, display_name, username, avatar_url)')
          .eq('following_id', profileId);
        setPeople((data ?? []).map(d => d.follower).filter(Boolean));
      } else {
        const { data } = await supabase
          .from('follows')
          .select('following:following_id(id, display_name, username, avatar_url)')
          .eq('follower_id', profileId);
        setPeople((data ?? []).map(d => d.following).filter(Boolean));
      }

      // Which of these does the current user follow?
      if (currentUserId) {
        const { data: myF } = await supabase
          .from('follows').select('following_id').eq('follower_id', currentUserId);
        setMyFollows(new Set((myF ?? []).map(r => r.following_id)));
      }
      setLoadingP(false);
    };
    fetchPeople();
  }, [tab, profileId, currentUserId]);

  const filtered = people.filter(u =>
    u.display_name?.toLowerCase().includes(query.toLowerCase()) ||
    u.username?.toLowerCase().includes(query.toLowerCase())
  );

  const toggleFollow = async (targetId) => {
    if (!currentUserId) return;
    const isFollowing = myFollows.has(targetId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId);
      setMyFollows(prev => { const next = new Set(prev); next.delete(targetId); return next; });
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId });
      setMyFollows(prev => new Set([...prev, targetId]));
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{maxHeight:'80vh'}}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-black/6 flex-shrink-0">
          <div className="flex gap-1 bg-black/[0.04] rounded-xl p-1">
            {['followers','following'].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-[11px] transition-all capitalize ${tab===t?'bg-white text-black shadow-sm border border-black/6':'text-black/40 hover:text-black/60'}`} style={serif}>
                {t==='followers'?`${fmtCount(followersCount)} Followers`:`${fmtCount(followingCount)} Following`}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-black/25 hover:text-black hover:bg-black/5 transition-colors ml-2"><X className="w-4 h-4"/></button>
        </div>

        <div className="px-5 py-3 border-b border-black/5 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/25"/>
            <input type="text" placeholder="Search people…" value={query} onChange={e=>setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/[0.04] rounded-xl text-[12px] text-black placeholder:text-black/25 outline-none focus:bg-black/[0.06] transition-colors" style={serif}/>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-2">
          {loadingP ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-black/20 animate-spin"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-8 h-8 text-black/10 mb-3" strokeWidth={1}/>
              <p className="text-[13px] font-light text-black/30" style={serif}>No results</p>
            </div>
          ) : filtered.map(user => {
            const isF = myFollows.has(user.id);
            const isOwn = user.id === currentUserId;
            return (
              <div key={user.id} className="flex items-center gap-3 py-3 hover:bg-black/[0.02] rounded-xl transition-colors -mx-1 px-2">
                <div className="w-10 h-10 rounded-full flex-shrink-0 border border-black/8 overflow-hidden bg-black/5 flex items-center justify-center">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/>
                    : <span className="text-sm font-light text-black/40" style={serif}>{user.display_name?.[0]?.toUpperCase()??'?'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-light text-black truncate" style={serif}>{user.display_name}</p>
                  <p className="text-[11px] text-black/35 truncate" style={mono}>@{user.username}</p>
                </div>
                {!isOwn && (
                  <button onClick={()=>toggleFollow(user.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] transition-all border ${isF?'border-black/10 text-black/40 hover:border-red-200 hover:text-red-400 hover:bg-red-50':'border-black bg-black text-white hover:bg-black/75'}`}
                    style={{...serif,letterSpacing:'0.08em'}}>
                    {isF?<><UserCheck className="w-3 h-3"/>Following</>:<><UserPlus className="w-3 h-3"/>Follow</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-3 flex-shrink-0"/>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EditProfileModal (unchanged design)
// ─────────────────────────────────────────────────────────────────────────────
const EditProfileModal = ({ profile, onSave, onClose, saving, error, onUploadAvatar, onRemoveAvatar }) => {
  const [form,setForm]=useState({ display_name:profile?.display_name??'', username:profile?.username??'', bio:profile?.bio??'', location:profile?.location??'', website_url:profile?.website_url??'' });
  const [avatarPreview,setAvatarPreview]=useState(null);
  const [avatarFile,setAvatarFile]=useState(null);
  const fileRef=useRef(null);

  useEffect(()=>{ const h=(e)=>{if(e.key==='Escape')onClose();}; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[onClose]);
  const set=(k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));
  const handleAvatarChange=(e)=>{ const f=e.target.files?.[0]; if(!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); };
  const handleSubmit=async(e)=>{ e.preventDefault(); if(avatarFile) await onUploadAvatar?.(avatarFile); await onSave(form); };

  const Field=({label,value,onChange,placeholder,type='text',multiline=false})=>(
    <div>
      <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5" style={serif}>{label}</label>
      {multiline?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className="w-full border-b border-black/12 focus:border-black bg-transparent py-2 text-black placeholder:text-black/20 outline-none transition-colors resize-none text-[13px]" style={serif}/>:<input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full border-b border-black/12 focus:border-black bg-transparent py-2 text-black placeholder:text-black/20 outline-none transition-colors text-[13px]" style={serif}/>}
    </div>
  );
  const avatarSrc=avatarPreview??profile?.avatar_url;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-black/6">
          <div>
            <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-1" style={serif}>Account</p>
            <h2 className="text-2xl font-light text-black" style={serif}>Edit profile</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors"><X className="w-4 h-4"/></button>
        </div>
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-black/8 border border-black/10">
                {avatarSrc?<img src={avatarSrc} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center"><span className="text-2xl font-light text-black/25" style={serif}>{form.display_name?.[0]?.toUpperCase()??'?'}</span></div>}
              </div>
              <button type="button" onClick={()=>fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"><Camera className="w-3 h-3 text-white"/></button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
            </div>
            <div>
              <p className="text-[11px] font-medium text-black">Profile photo</p>
              <p className="text-[10px] text-black/35 mt-0.5">JPG, PNG or WebP. Max 5MB.</p>
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={()=>fileRef.current?.click()} className="text-[10px] text-black/50 hover:text-black transition-colors underline underline-offset-2">Change</button>
                {avatarSrc&&<button type="button" onClick={()=>{onRemoveAvatar?.();setAvatarPreview(null);}} className="text-[10px] text-red-400 hover:text-red-600 transition-colors">Remove</button>}
              </div>
            </div>
          </div>
          <div className="h-px bg-black/6"/>
          <Field label="Display name" value={form.display_name} onChange={set('display_name')} placeholder="Your name"/>
          <Field label="Username"     value={form.username}     onChange={set('username')}     placeholder="your_handle"/>
          <Field label="Bio"          value={form.bio}          onChange={set('bio')}          placeholder="Tell the world about your style…" multiline/>
          <Field label="Location"     value={form.location}     onChange={set('location')}     placeholder="City, Country"/>
          <Field label="Website"      value={form.website_url}  onChange={set('website_url')}  placeholder="https://yoursite.com" type="url"/>
          {error&&<p className="text-[10px] text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-black/10 text-[11px] text-black/50 hover:border-black/25 hover:text-black transition-all" style={{...serif,letterSpacing:'0.1em'}}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-white text-[11px] flex items-center justify-center gap-2 hover:bg-black/80 disabled:opacity-30 transition-all" style={{...serif,letterSpacing:'0.15em',textTransform:'uppercase'}}>
              {saving?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<><Check className="w-3.5 h-3.5"/>Save changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage — CONNECTED TO SUPABASE
// ─────────────────────────────────────────────────────────────────────────────
const ProfilePage = ({ currentUser, onOpenAuth, initialProfile, onProfileUpdate }) => {
  const userId = currentUser?.id ?? null;

  // Real Supabase data — initialProfile seeds the display while fetching
  const {
    profile: fetchedProfile, outfits, loading, saving, error,
    updateProfile, uploadAvatar, uploadCover, removeAvatar,
    deleteOutfit, toggleOutfitVisibility,
  } = useProfile(userId);

  // Merge: fetched takes precedence; initialProfile prevents blank flash
  const profile = fetchedProfile ?? initialProfile ?? null;

  const [editOpen,      setEditOpen]      = useState(false);
  const [saveSuccess,   setSaveSuccess]   = useState(false);
  const [peopleModal,   setPeopleModal]   = useState(null);
  const [outfitModalId, setOutfitModalId] = useState(null);

  const coverFileRef = useRef(null);
  const initials     = (profile?.display_name ?? profile?.username ?? currentUser?.email ?? '?')[0].toUpperCase();

  // Handle cover file selection
  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadCover(file); }
    catch (err) { console.error('Cover upload failed:', err); }
  };

  const handleSave = async (fields) => {
    const updated = await updateProfile(fields);
    setEditOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onProfileUpdate?.(updated);
  };

  const handleAvatarUpload = async (file) => {
    const url = await uploadAvatar(file);
    if (url) onProfileUpdate?.({ ...profile, avatar_url: url });
  };

  const handleClickOutfit = useCallback((outfit) => {
    if (outfit.submission_id) setOutfitModalId(outfit.submission_id);
  }, []);

  // ── Signed-out / no user ─────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <span className="text-5xl mb-4">👤</span>
        <h2 className="text-2xl font-light text-black mb-2" style={serif}>Sign in to view your profile</h2>
        <p className="text-[12px] text-black/35 mb-6">Your saved looks live here.</p>
        <button onClick={onOpenAuth} className="px-6 py-3 bg-black text-white text-[11px] hover:bg-black/80 transition-colors"
          style={{...serif,letterSpacing:'0.15em',textTransform:'uppercase'}}>Sign in</button>
      </div>
    );
  }

  // ── Loading (only if no initialProfile to show) ──────────────────────────
  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-black/20 animate-spin"/>
      </div>
    );
  }

  return (
    <>
      {editOpen && (
        <EditProfileModal profile={profile} onSave={handleSave} onClose={()=>setEditOpen(false)}
          saving={saving} error={error} onUploadAvatar={handleAvatarUpload} onRemoveAvatar={removeAvatar}/>
      )}

      {peopleModal && (
        <PeopleModal
          mode={peopleModal}
          profileId={profile?.id ?? userId}
          currentUserId={currentUser?.id}
          onClose={()=>setPeopleModal(null)}
          followersCount={profile?.followers ?? 0}
          followingCount={profile?.following ?? 0}
        />
      )}

      {outfitModalId && (
        <OutfitModal submissionId={outfitModalId} currentUser={currentUser} onClose={()=>setOutfitModalId(null)}/>
      )}

      <div className="max-w-4xl mx-auto w-full">

        {/* Cover + avatar */}
        <div className="mb-6">
          <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-black/[0.06] border border-black/8">
            {profile?.cover_url
              ? <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover"/>
              : <div className="absolute inset-0" style={{backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(0,0,0,0.018) 20px,rgba(0,0,0,0.018) 21px)'}}/>
            }
            <button onClick={()=>coverFileRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-xl text-[10px] text-black/60 hover:text-black hover:bg-white transition-all border border-black/8">
              <Camera className="w-3 h-3"/>Edit cover
            </button>
            <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange}/>
          </div>

          <div className="relative -mt-12 ml-6 flex items-end justify-between">
            <div className="relative flex-shrink-0 z-10">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-md">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-black/8 flex items-center justify-center">
                      <span className="text-3xl font-light text-black/30" style={serif}>{initials}</span>
                    </div>
                }
              </div>
              {saveSuccess && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Check className="w-3 h-3 text-white"/>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pb-1">
              <button onClick={()=>setEditOpen(true)} className="flex items-center gap-1.5 px-4 py-2 border border-black/12 rounded-xl text-[11px] text-black/55 hover:border-black/30 hover:text-black transition-all bg-white">
                <Edit3 className="w-3 h-3"/>Edit profile
              </button>
              <button className="w-8 h-8 border border-black/12 rounded-xl flex items-center justify-center text-black/40 hover:border-black/30 hover:text-black transition-all bg-white">
                <Settings className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        </div>

        {/* Bio + meta */}
        <div className="px-1 mb-5">
          <h1 className="text-2xl font-light text-black leading-tight" style={serif}>{profile?.display_name ?? 'Anonymous'}</h1>
          <p className="text-[12px] text-black/35 mt-0.5">@{profile?.username ?? currentUser?.email?.split('@')[0] ?? '—'}</p>
          {profile?.bio && <p className="text-[13px] text-black/55 leading-relaxed mt-3 max-w-md" style={serif}>{profile.bio}</p>}
          <div className="flex items-center flex-wrap gap-4 mt-3">
            {profile?.location && <span className="flex items-center gap-1.5 text-[11px] text-black/35"><MapPin className="w-3 h-3"/>{profile.location}</span>}
            {profile?.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-black/50 hover:text-black transition-colors">
                <Link2 className="w-3 h-3"/>{profile.website_url.replace(/^https?:\/\//,'').replace(/\/$/,'')}
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 px-1 mb-8 pb-6 border-b border-black/6">
          <button onClick={()=>setPeopleModal('followers')} className="flex items-baseline gap-1.5 group">
            <span className="text-[1.1rem] font-light text-black leading-none group-hover:text-black/60 transition-colors" style={serif}>{fmtCount(profile?.followers)}</span>
            <span className="text-[10px] text-black/30 group-hover:text-black/50 transition-colors uppercase tracking-wide underline-offset-2 group-hover:underline">Followers</span>
          </button>
          <div className="w-px h-4 bg-black/10"/>
          <button onClick={()=>setPeopleModal('following')} className="flex items-baseline gap-1.5 group">
            <span className="text-[1.1rem] font-light text-black leading-none group-hover:text-black/60 transition-colors" style={serif}>{fmtCount(profile?.following)}</span>
            <span className="text-[10px] text-black/30 group-hover:text-black/50 transition-colors uppercase tracking-wide underline-offset-2 group-hover:underline">Following</span>
          </button>
          <div className="w-px h-4 bg-black/10"/>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.1rem] font-light text-black leading-none" style={serif}>{outfits.length}</span>
            <span className="text-[10px] text-black/30 uppercase tracking-wide">Looks</span>
          </div>
        </div>

        {/* Archive */}
        {loading && outfits.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-black/20 animate-spin"/>
          </div>
        ) : outfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-25 select-none">
            <ImageOff className="w-10 h-10 text-black/20 mb-3" strokeWidth={1}/>
            <p className="text-lg font-light text-black/40" style={serif}>No saved designs yet</p>
            <p className="text-[11px] text-black/25 mt-1">Save an outfit from the Try On page to start your archive.</p>
          </div>
        ) : (
          <LooksArchive outfits={outfits} onDelete={deleteOutfit} onTogglePublic={toggleOutfitVisibility} onClickOutfit={handleClickOutfit}/>
        )}
      </div>
    </>
  );
};

export default ProfilePage;