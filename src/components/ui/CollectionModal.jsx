// src/components/ui/CollectionModal.jsx
// Opens when user clicks a tag group row.
// Shows all outfits in the collection as vertically scrollable cards.
// Clicking a card opens the full OutfitModal.

import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, ChevronRight } from 'lucide-react';
import OutfitModal from './OutfitModal';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

// ---------------------------------------------------------------------------
// Single outfit card inside the collection — vertical card, minimal
// ---------------------------------------------------------------------------
const CollectionCard = ({ submission, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const outfit = submission.outfit ?? {};

  return (
    <div
      onClick={() => onClick(submission.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-stretch gap-5 py-5 border-b border-black/6 cursor-pointer last:border-0 transition-colors duration-150 hover:bg-black/[0.015] -mx-6 px-6"
    >
      {/* Thumbnail */}
      <div className="w-16 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-black/6 relative">
        {submission.imageUrl ? (
          <img
            src={submission.imageUrl}
            alt={outfit.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-end justify-center pb-2 opacity-15">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-3 h-3 rounded-full bg-black" />
              <div className="w-5 h-7 bg-black rounded-t-sm" />
              <div className="flex gap-0.5">
                <div className="w-2 h-4 bg-black rounded-b-sm" />
                <div className="w-2 h-4 bg-black rounded-b-sm" />
              </div>
            </div>
          </div>
        )}
        {outfit.dominant_color && (
          <div
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-white/50"
            style={{ background: outfit.dominant_color }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-light text-black leading-snug truncate" style={serif}>
              {outfit.name ?? 'Untitled Look'}
            </p>
            <p className="text-[10px] text-black/35 mt-0.5">
              @{submission.submitter?.username ?? '—'}
            </p>
          </div>
          <ChevronRight
            className="w-3.5 h-3.5 text-black/20 flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </div>

        {outfit.description && (
          <p className="text-[11px] text-black/40 mt-1.5 leading-relaxed line-clamp-2">
            {outfit.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 text-black/25">
            <Heart className="w-2.5 h-2.5" fill="none" strokeWidth={1.5} />
            <span className="text-[9px] tabular-nums">{submission.likeCount ?? 0}</span>
          </div>
          {outfit.garment_type && (
            <span className="text-[9px] text-black/20 uppercase tracking-widest">
              {outfit.garment_type}
            </span>
          )}
          {(outfit.tags ?? []).filter(t => t !== 'untagged').slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[8px] text-black/25 border border-black/8 px-1.5 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CollectionModal
// ---------------------------------------------------------------------------
const CollectionModal = ({ tag, submissions, onClose, currentUser }) => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Escape to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedSubmissionId) setSelectedSubmissionId(null);
        else onClose?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, selectedSubmissionId]);

  return (
    <>
      {/* Nested OutfitModal */}
      {selectedSubmissionId && (
        <OutfitModal
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
          currentUser={currentUser}
        />
      )}

      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Panel — narrow, tall, scrollable */}
        <div className="relative z-10 w-full max-w-lg h-[88vh] max-h-[700px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">

          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-black/6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-1" style={serif}>
                  Collection
                </p>
                <h2 className="text-2xl font-light text-black capitalize leading-tight" style={serif}>
                  #{tag}
                </h2>
                <p className="text-[10px] text-black/30 mt-1">
                  {submissions.length} {submissions.length === 1 ? 'look' : 'looks'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-1 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {submissions.length === 0 ? (
              <div className="flex items-center justify-center h-full opacity-25">
                <p className="text-[11px] text-black/30">No outfits in this collection yet.</p>
              </div>
            ) : (
              submissions.map((sub) => (
                <CollectionCard
                  key={sub.id}
                  submission={sub}
                  onClick={setSelectedSubmissionId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CollectionModal;