// src/components/TryOn/SimilarLooksRow.jsx
import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import OutfitModal from '../ui/OutfitModal';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
const OutfitCard = ({ outfit, onClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onClick(outfit.submission_id ?? outfit.id)}
      className="group cursor-pointer flex-shrink-0 w-[88px] select-none"
    >
      <div className="aspect-[3/4] rounded-2xl mb-1.5 border border-black/[0.07] hover:border-black/25 transition-all duration-200 overflow-hidden relative bg-gray-50 shadow-sm hover:shadow-md">

        {outfit.imageUrl && !imgError ? (
          <img
            src={outfit.imageUrl}
            alt={outfit.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-15 group-hover:opacity-30 transition-opacity">
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

        {outfit.dominant_color && (
          <div
            className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white/60 shadow-sm"
            style={{ background: outfit.dominant_color }}
          />
        )}

        {outfit.like_count > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            <Heart className="w-2 h-2 text-black/40" fill="currentColor" />
            <span className="text-[8px] text-black/40 tabular-nums font-medium">{outfit.like_count}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/4 transition-colors duration-200" />
      </div>

      <p className="text-[9px] text-black/40 font-medium truncate group-hover:text-black/65 transition-colors">
        {outfit.outfit_name ?? 'Style'}
      </p>
      {outfit.username && (
        <p className="text-[8px] text-black/20 truncate">@{outfit.username}</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Arrow
// ---------------------------------------------------------------------------
const Arrow = ({ dir, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all select-none ${
      disabled
        ? 'border-black/6 text-black/12 cursor-not-allowed'
        : 'border-black/12 text-black/35 hover:border-black/35 hover:text-black active:scale-90'
    }`}
  >
    {dir === 'left' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
  </button>
);

// ---------------------------------------------------------------------------
// SimilarLooksRow
// ---------------------------------------------------------------------------
const SimilarLooksRow = ({ visible, outfits: propOutfits, currentUser }) => {
  const scrollRef = useRef(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Placeholder data until publicFeedService wired in
  const outfits = propOutfits ?? Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    submission_id: i + 1,   // this is what gets passed to OutfitModal
    outfit_name: `Style ${i + 1}`,
    imageUrl: null,
    like_count: Math.floor(Math.random() * 30),
    dominant_color: `hsl(${i * 36}, 28%, 66%)`,
    username: `user${i + 1}`,
  }));

  if (!visible) return null;

  const CARD_W = 88 + 12;

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? CARD_W * 3 : -CARD_W * 3, behavior: 'smooth' });
  };

  const onScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setAtStart(scrollLeft <= 4);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 4);
  };

  return (
    <>
      {selectedSubmissionId && (
        <OutfitModal
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
          currentUser={currentUser}
        />
      )}

      <div className="flex-shrink-0 border-t border-black/8 bg-white">
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="text-[10px] font-semibold text-black uppercase tracking-widest">
            Similar Looks
          </h3>
          <div className="flex items-center gap-2">
            <Arrow dir="left"  onClick={() => scroll('left')}  disabled={atStart} />
            <Arrow dir="right" onClick={() => scroll('right')} disabled={atEnd} />
            <div className="w-px h-3 bg-black/10 mx-1" />
            <button className="text-[10px] text-black/30 hover:text-black transition-colors">
              See all →
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex gap-3 px-5 pb-4 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {outfits.map((o) => (
            <OutfitCard key={o.id} outfit={o} onClick={setSelectedSubmissionId} />
          ))}
        </div>
      </div>
    </>
  );
};

export default SimilarLooksRow;