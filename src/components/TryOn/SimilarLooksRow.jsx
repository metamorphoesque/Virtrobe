// src/components/TryOn/SimilarLooksRow.jsx
// Horizontal scrolling similar looks strip.
// Hidden until a mannequin has been selected.

import React from 'react';

const SimilarLooksRow = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="flex-shrink-0 border-t border-black/10 bg-white">
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <h3 className="text-[10px] font-semibold text-black uppercase tracking-widest">
          Similar Looks
        </h3>
        <button className="text-[10px] text-black/40 hover:text-black transition-colors">
          See all →
        </button>
      </div>

      {/* Full-width horizontal scroll — never wraps, never grows vertically */}
      <div
        className="flex gap-3 px-5 pb-4 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.from({ length: 8 }, (_, i) => i + 1).map((i) => (
          <div key={i} className="group cursor-pointer flex-shrink-0 w-20">
            <div className="aspect-[3/4] bg-gray-50 rounded-xl mb-1.5 border border-black/[0.08] hover:border-black transition-all overflow-hidden relative">
              {/* Placeholder silhouette */}
              <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-black" />
                  <div className="w-6 h-8 bg-black rounded-t-md" />
                  <div className="flex gap-0.5">
                    <div className="w-2.5 h-5 bg-black rounded-b-md" />
                    <div className="w-2.5 h-5 bg-black rounded-b-md" />
                  </div>
                </div>
              </div>
              {/* Colour swatch hint */}
              <div
                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-black/10"
                style={{ background: `hsl(${i * 42}, 35%, 68%)` }}
              />
            </div>
            <p className="text-[9px] text-black/50 font-medium truncate">Style {i}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimilarLooksRow;