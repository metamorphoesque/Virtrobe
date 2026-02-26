// src/components/pages/MoodboardPage.jsx
// Public moodboard feed — outfits grouped by tag in horizontal rows.
// Clicking a row header or "See all" opens CollectionModal (scrollable cards).
// Clicking a thumbnail directly opens OutfitModal.

import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart, Sparkles } from 'lucide-react';
import { useMoodboardFeed } from '../../hooks/useMoodboardFeed';
import CollectionModal from '../ui/CollectionModal';
import OutfitModal from '../ui/OutfitModal';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
const SkeletonRow = () => (
  <div className="mb-12">
    <div className="flex items-end justify-between mb-4">
      <div>
        <div className="w-16 h-2.5 bg-black/6 rounded animate-pulse mb-2" />
        <div className="w-28 h-5 bg-black/8 rounded animate-pulse" />
      </div>
    </div>
    <div className="flex gap-4">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36">
          <div className="aspect-[3/4] bg-black/5 rounded-2xl animate-pulse mb-2" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="w-20 h-2.5 bg-black/5 rounded animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Outfit thumbnail card
// ---------------------------------------------------------------------------
const OutfitThumb = ({ submission, onClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const outfit = submission.outfit ?? {};

  return (
    <div
      onClick={() => onClick(submission.id)}
      className="group flex-shrink-0 w-36 cursor-pointer select-none"
    >
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border border-black/6 hover:border-black/20 transition-all duration-200 relative shadow-sm hover:shadow-md mb-2">
        {submission.imageUrl && !imgErr ? (
          <img
            src={submission.imageUrl}
            alt={outfit.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-12 group-hover:opacity-25 transition-opacity">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-4 h-4 rounded-full bg-black" />
              <div className="w-7 h-9 bg-black rounded-t-md" />
              <div className="flex gap-0.5">
                <div className="w-3 h-6 bg-black rounded-b-md" />
                <div className="w-3 h-6 bg-black rounded-b-md" />
              </div>
            </div>
          </div>
        )}

        {/* Dominant colour dot */}
        {outfit.dominant_color && (
          <div
            className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white/60 shadow-sm"
            style={{ background: outfit.dominant_color }}
          />
        )}

        {/* Like badge */}
        {submission.likeCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Heart className="w-2 h-2 text-black/40" fill="currentColor" />
            <span className="text-[8px] text-black/40 tabular-nums font-medium">{submission.likeCount}</span>
          </div>
        )}

        {/* Hover scrim */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
      </div>

      <p className="text-[10px] text-black/45 font-medium truncate group-hover:text-black/70 transition-colors" style={serif}>
        {outfit.name ?? 'Untitled'}
      </p>
      <p className="text-[8px] text-black/22 truncate">
        @{submission.submitter?.username ?? '—'}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Horizontal row for one tag group
// ---------------------------------------------------------------------------
const TagRow = ({ tag, submissions, onSeeAll, onThumbClick }) => {
  const scrollRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const CARD_W = 144 + 16; // w-36 + gap-4

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({
      left: dir === 'right' ? CARD_W * 3 : -CARD_W * 3,
      behavior: 'smooth',
    });
  };

  const onScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setAtStart(scrollLeft <= 4);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 4);
  };

  return (
    <div className="mb-12">
      {/* Row header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[8px] text-black/20 uppercase tracking-[0.35em] mb-1" style={serif}>
            Collection
          </p>
          <button
            onClick={() => onSeeAll(tag, submissions)}
            className="group flex items-center gap-2"
          >
            <h2
              className="text-xl font-light text-black capitalize hover:text-black/60 transition-colors"
              style={serif}
            >
              #{tag}
            </h2>
            <ChevronRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black/50 group-hover:translate-x-0.5 transition-all duration-150" />
          </button>
          <p className="text-[9px] text-black/25 mt-0.5">
            {submissions.length} {submissions.length === 1 ? 'look' : 'looks'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={atStart}
            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
              atStart
                ? 'border-black/6 text-black/12 cursor-not-allowed'
                : 'border-black/12 text-black/35 hover:border-black/35 hover:text-black active:scale-90'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={atEnd}
            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
              atEnd
                ? 'border-black/6 text-black/12 cursor-not-allowed'
                : 'border-black/12 text-black/35 hover:border-black/35 hover:text-black active:scale-90'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSeeAll(tag, submissions)}
            className="text-[10px] text-black/25 hover:text-black transition-colors ml-1"
          >
            See all →
          </button>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {submissions.map((sub) => (
          <OutfitThumb
            key={sub.id}
            submission={sub}
            onClick={onThumbClick}
          />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-32 opacity-30 select-none">
    <Sparkles className="w-10 h-10 text-black/20 mb-4" strokeWidth={1} />
    <p className="text-lg font-light text-black/40" style={serif}>No looks posted yet.</p>
    <p className="text-[11px] text-black/25 mt-1">Be the first to post an outfit on Virtrobe.</p>
  </div>
);

// ---------------------------------------------------------------------------
// MoodboardPage
// ---------------------------------------------------------------------------
const MoodboardPage = ({ currentUser }) => {
  const { groups, loading, error } = useMoodboardFeed();

  // CollectionModal state
  const [collectionTag, setCollectionTag]               = useState(null);
  const [collectionSubmissions, setCollectionSubmissions] = useState([]);

  // Direct OutfitModal state (from thumbnail click)
  const [directSubmissionId, setDirectSubmissionId] = useState(null);

  const handleSeeAll = (tag, submissions) => {
    setCollectionTag(tag);
    setCollectionSubmissions(submissions);
  };

  const handleThumbClick = (submissionId) => {
    setDirectSubmissionId(submissionId);
  };

  return (
    <>
      {/* Collection modal */}
      {collectionTag && (
        <CollectionModal
          tag={collectionTag}
          submissions={collectionSubmissions}
          onClose={() => setCollectionTag(null)}
          currentUser={currentUser}
        />
      )}

      {/* Direct outfit modal (thumbnail click) */}
      {directSubmissionId && (
        <OutfitModal
          submissionId={directSubmissionId}
          onClose={() => setDirectSubmissionId(null)}
          currentUser={currentUser}
        />
      )}

      <div className="w-full">
        {/* Page header */}
        <div className="mb-10 pt-2">
          <p className="text-[9px] text-black/20 uppercase tracking-[0.4em] mb-2" style={serif}>
            Explore
          </p>
          <h1 className="text-3xl font-light text-black" style={serif}>
            Moodboards
          </h1>
          <p className="text-[12px] text-black/35 mt-1.5">
            Outfits curated by the Virtrobe community, grouped by style.
          </p>
        </div>

        {/* Thin rule */}
        <div className="h-px bg-black/6 mb-10" />

        {/* Content */}
        {error && (
          <p className="text-[11px] text-red-400 mb-6">{error}</p>
        )}

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map(({ tag, submissions }) => (
            <TagRow
              key={tag}
              tag={tag}
              submissions={submissions}
              onSeeAll={handleSeeAll}
              onThumbClick={handleThumbClick}
            />
          ))
        )}
      </div>
    </>
  );
};

export default MoodboardPage;