// src/components/pages/MoodboardPage.jsx
// Layout  : max-w-5xl centered, everything inside left-aligned.
// Tabs    : horizontal scrollable tag pills — each tab is one collection.
// Grid    : 2-column portrait cards for the active collection only.
// Stats   : looks count + unique contributors per collection.
// Backend : reads from useMoodboardFeed() which queries public_submissions.
// Modals  : clicking a card opens OutfitModal.

import React, { useState, useRef, useEffect } from 'react';
import {
  Heart, Users, ImageOff, Sparkles, ChevronLeft,
  ChevronRight, Loader2,
} from 'lucide-react';
import { useMoodboardFeed } from '../../hooks/useMoodboardFeed';
import OutfitModal from '../ui/OutfitModal';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const mono  = { fontFamily: "'DM Mono', 'Courier New', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtN   = (n) => n >= 1000 ? (n/1000).toFixed(1).replace('.0','')+'k' : String(n ?? 0);
const uniqueContributors = (submissions) =>
  new Set(submissions.map(s => s.submitter?.id ?? s.submitter?.username)).size;

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — 2-col grid
// ─────────────────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="grid grid-cols-2 gap-4">
    {Array(6).fill(0).map((_, i) => (
      <div
        key={i}
        className="aspect-[3/4] rounded-2xl bg-black/[0.05] animate-pulse"
        style={{ animationDelay: `${i * 70}ms` }}
      />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Single outfit card in 2-column grid
// ─────────────────────────────────────────────────────────────────────────────
const OutfitCard = ({ submission, onClick }) => {
  const [imgErr, setImgErr]   = useState(false);
  const [liked,  setLiked]    = useState(false);
  const [likes,  setLikes]    = useState(submission.likeCount ?? 0);

  const outfit       = submission.outfit ?? {};
  const bgColor      = outfit.dominant_color ?? '#e8e4de';
  const hasImage     = submission.imageUrl && !imgErr;

  // Light/dark text depending on background luminance
  const isLightBg = (() => {
    const h = bgColor.replace('#','');
    if (h.length < 6) return true;
    const r = parseInt(h.slice(0,2),16);
    const g = parseInt(h.slice(2,4),16);
    const b = parseInt(h.slice(4,6),16);
    return (r*299 + g*587 + b*114) / 1000 > 155;
  })();

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(v => !v);
    setLikes(n => liked ? n - 1 : n + 1);
  };

  return (
    <article
      onClick={() => onClick(submission.id)}
      className="group relative cursor-pointer select-none"
    >
      {/* Portrait frame */}
      <div
        className="relative rounded-2xl overflow-hidden border border-black/6 hover:border-black/18 transition-all duration-300 shadow-sm hover:shadow-xl"
        style={{ aspectRatio: '3/4', background: bgColor }}
      >
        {/* Image or silhouette */}
        {hasImage ? (
          <img
            src={submission.imageUrl}
            alt={outfit.name ?? 'Outfit'}
            onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-10">
            <svg viewBox="0 0 60 100" className="w-28 opacity-[0.13]" fill="white">
              <circle cx="30" cy="14" r="10" />
              <path d="M14 30 Q14 24 30 24 Q46 24 46 30 L50 70 Q50 72 48 72 L38 72 L36 100 L24 100 L22 72 L12 72 Q10 72 10 70 Z" />
            </svg>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Like pill — top right */}
        <button
          onClick={handleLike}
          className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all duration-200 hover:scale-105 active:scale-95 ${
            liked
              ? 'bg-black/70 border-black/0 text-white'
              : 'bg-white/20 border-white/25 text-white/80 hover:bg-white/30'
          }`}
        >
          <Heart
            className="w-3 h-3 transition-colors duration-200"
            fill={liked ? '#ff6b6b' : 'transparent'}
            stroke={liked ? '#ff6b6b' : 'currentColor'}
          />
          {likes > 0 && (
            <span className="text-[9px] tabular-nums leading-none" style={mono}>{fmtN(likes)}</span>
          )}
        </button>

        {/* Submitter avatar chip — top left */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/15">
          <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {submission.submitter?.avatar_url ? (
              <img src={submission.submitter.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[8px] text-white font-medium" style={serif}>
                {(submission.submitter?.display_name ?? submission.submitter?.username ?? '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[9px] text-white/80 truncate max-w-[80px]" style={mono}>
            @{submission.submitter?.username ?? '—'}
          </span>
        </div>

        {/* Outfit name — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <p
            className="text-white font-light leading-snug truncate"
            style={{ ...serif, fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}
          >
            {outfit.name ?? 'Untitled'}
          </p>
          {/* Tags */}
          {(outfit.tags ?? []).slice(0,2).map(t => (
            <span
              key={t}
              className="inline-block mt-1 mr-1 px-1.5 py-0.5 rounded-full bg-white/15 text-[8px] text-white/70 backdrop-blur-sm capitalize"
              style={mono}
            >
              #{t}
            </span>
          ))}
        </div>

        {/* Hover scrim */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tag tab pill
// ─────────────────────────────────────────────────────────────────────────────
const TagTab = ({ tag, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 border text-[11px] focus:outline-none ${
      active
        ? 'bg-black text-white border-black shadow-sm scale-[1.02]'
        : 'bg-white text-black/45 border-black/10 hover:border-black/30 hover:text-black hover:bg-black/[0.025]'
    }`}
    style={{ ...serif, letterSpacing: '0.03em' }}
  >
    <span className="capitalize">{tag}</span>
    <span
      className={`text-[9px] tabular-nums rounded-full px-1.5 py-0.5 leading-none transition-colors ${
        active ? 'bg-white/20 text-white/80' : 'bg-black/[0.06] text-black/30'
      }`}
      style={mono}
    >
      {count}
    </span>
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Collection stats bar
// ─────────────────────────────────────────────────────────────────────────────
const CollectionStats = ({ tag, submissions }) => {
  const contributors = uniqueContributors(submissions);
  const totalLikes   = submissions.reduce((s, sub) => s + (sub.likeCount ?? 0), 0);

  // Gather all unique related tags across cards in this collection
  const relatedTags = [...new Set(
    submissions.flatMap(s => s.outfit?.tags ?? [])
  )].filter(t => t !== tag).slice(0, 6);

  return (
    <div className="mb-8">
      {/* Title row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[9px] text-black/20 uppercase tracking-[0.45em] mb-1.5" style={serif}>
            Collection
          </p>
          <h2
            className="font-light text-black capitalize leading-none"
            style={{ ...serif, fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}
          >
            #{tag}
          </h2>
        </div>

        {/* Stats chips */}
        <div className="flex items-stretch gap-3 mt-1">
          {[
            { value: fmtN(submissions.length), label: 'Looks',   Icon: null },
            { value: fmtN(contributors),        label: 'People',  Icon: Users },
            { value: fmtN(totalLikes),           label: 'Likes',   Icon: Heart },
          ].map(({ value, label, Icon }) => (
            <div key={label} className="flex flex-col items-end">
              <span
                className="text-[1.15rem] font-light text-black leading-none tabular-nums"
                style={serif}
              >
                {value}
              </span>
              <span className="text-[9px] text-black/28 uppercase tracking-wide mt-0.5 flex items-center gap-1">
                {Icon && <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />}
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Related tag chips */}
      {relatedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {relatedTags.map(t => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full border border-black/8 text-[9px] text-black/30 capitalize"
              style={mono}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MoodboardPage
// ─────────────────────────────────────────────────────────────────────────────
const MoodboardPage = ({ currentUser }) => {
  const { groups, loading, error } = useMoodboardFeed();

  const [activeTag,   setActiveTag]   = useState(null);
  const [outfitModal, setOutfitModal] = useState(null);

  // Tabs scroll state
  const tabsRef   = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd,   setAtEnd]   = useState(false);

  // Set initial active tab once data loads
  useEffect(() => {
    if (groups.length > 0 && !activeTag) {
      setActiveTag(groups[0].tag);
    }
  }, [groups]);

  const onTabsScroll = () => {
    if (!tabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
    setAtStart(scrollLeft <= 4);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 4);
  };

  const scrollTabs = (dir) =>
    tabsRef.current?.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' });

  // Active collection data
  const activeGroup = groups.find(g => g.tag === activeTag);
  const submissions  = activeGroup?.submissions ?? [];

  // Animate grid on tab switch
  const [gridKey, setGridKey] = useState(0);
  const handleTabChange = (tag) => {
    setActiveTag(tag);
    setGridKey(k => k + 1);
  };

  return (
    <>
      {outfitModal && (
        <OutfitModal
          submissionId={outfitModal}
          onClose={() => setOutfitModal(null)}
          currentUser={currentUser}
        />
      )}

      <style>{`
        @keyframes mbFadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .mb-fade-up { animation: mbFadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .mb-stagger-1 { animation-delay:  40ms; }
        .mb-stagger-2 { animation-delay:  80ms; }
        .mb-stagger-3 { animation-delay: 120ms; }
        .mb-stagger-4 { animation-delay: 160ms; }
        .mb-stagger-5 { animation-delay: 200ms; }
        .mb-stagger-6 { animation-delay: 240ms; }

        /* Hide scrollbar on tabs strip */
        .tabs-scroll::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── Centered container ── */}
      <div className="max-w-5xl mx-auto w-full">

        {/* ── Page header ── */}
        <div className="mb-8 pt-2">
          <p className="text-[9px] text-black/20 uppercase tracking-[0.45em] mb-2" style={serif}>
            Community
          </p>
          <h1
            className="font-light text-black"
            style={{ ...serif, fontSize: 'clamp(2.2rem, 4.5vw, 3rem)', lineHeight: 1.0 }}
          >
            Moodboards
          </h1>
          <p className="text-[12px] text-black/35 mt-2.5 leading-relaxed max-w-sm" style={serif}>
            Public looks curated by the community, organised by style.
          </p>
        </div>

        <div className="h-px bg-black/6 mb-8" />

        {/* ── Horizontal tag tabs ── */}
        <div className="relative mb-10">
          {/* Left fade + arrow */}
          {!atStart && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <button
                onClick={() => scrollTabs('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-black/12 shadow-md flex items-center justify-center text-black/40 hover:text-black hover:border-black/25 transition-all -translate-x-3"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <div
            ref={tabsRef}
            onScroll={onTabsScroll}
            className="tabs-scroll flex items-center gap-2 overflow-x-auto py-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading
              ? Array(6).fill(0).map((_,i) => (
                  <div key={i} className="flex-shrink-0 h-9 rounded-full bg-black/5 animate-pulse" style={{ width: `${60 + i*15}px`, animationDelay:`${i*60}ms` }} />
                ))
              : groups.map(({ tag, submissions: subs }) => (
                  <TagTab
                    key={tag}
                    tag={tag}
                    active={activeTag === tag}
                    count={subs.length}
                    onClick={() => handleTabChange(tag)}
                  />
                ))
            }
          </div>

          {/* Right fade + arrow */}
          {!atEnd && groups.length > 0 && (
            <>
              <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
              <button
                onClick={() => scrollTabs('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-black/12 shadow-md flex items-center justify-center text-black/40 hover:text-black hover:border-black/25 transition-all translate-x-3"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="text-[11px] text-red-400 mb-6" style={serif}>{error}</p>
        )}

        {/* ── Active collection ── */}
        {loading ? (
          <>
            {/* Skeleton stats */}
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-2">
                <div className="w-20 h-2.5 rounded bg-black/6 animate-pulse" />
                <div className="w-40 h-9 rounded bg-black/8 animate-pulse" />
              </div>
              <div className="flex gap-4">
                {[60,50,55].map(w => <div key={w} className="w-12 h-10 rounded bg-black/5 animate-pulse" />)}
              </div>
            </div>
            <Skeleton />
          </>
        ) : !activeTag || groups.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-28 opacity-25 select-none">
            <Sparkles className="w-10 h-10 text-black/20 mb-3" strokeWidth={1} />
            <p className="text-lg font-light text-black/40" style={serif}>No public looks yet.</p>
            <p className="text-[11px] text-black/25 mt-1" style={serif}>
              Be the first to post an outfit on Virtrobe.
            </p>
          </div>
        ) : (
          <div key={`${activeTag}-${gridKey}`}>
            {/* Collection header + stats */}
            <div className="mb-fade-up">
              <CollectionStats tag={activeTag} submissions={submissions} />
            </div>

            {/* 2-column portrait grid */}
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 select-none">
                <ImageOff className="w-8 h-8 text-black/20 mb-3" strokeWidth={1} />
                <p className="text-[13px] font-light text-black/35" style={serif}>
                  No looks in this collection yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                {submissions.map((sub, i) => (
                  <div
                    key={sub.id}
                    className={`mb-fade-up mb-stagger-${Math.min(i + 1, 6)}`}
                  >
                    <OutfitCard
                      submission={sub}
                      onClick={(id) => setOutfitModal(id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MoodboardPage;