// src/components/TryOn/SceneOverlay.jsx
import React from 'react';
import { User, RotateCcw, Lock, Plus, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tooltip (right-pointing, for right-side buttons)
// ---------------------------------------------------------------------------
const Tooltip = ({ text, children }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/85 backdrop-blur-sm text-white text-[10px] px-2.5 py-1.5 rounded-xl shadow-xl z-[100] pointer-events-none">
          {text}
          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-black/85" />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Action button — right side vertical stack
// When not logged in: shows tooltip + redirects to auth on click
// ---------------------------------------------------------------------------
const ActionButton = ({ label, onClick, isLoggedIn, disabledReason, onOpenAuth, dark = false }) => {
  const handleClick = () => {
    if (!isLoggedIn) {
      onOpenAuth?.();
    } else {
      onClick?.();
    }
  };

  const btn = (
    <button
      onClick={handleClick}
      className={`
        flex items-center justify-center px-4 py-3 rounded-2xl text-[11px] font-semibold
        tracking-wide transition-all duration-150 select-none w-full
        backdrop-blur-md shadow-lg active:scale-95
        ${dark
          ? 'bg-black/80 text-white hover:bg-black border border-white/10'
          : 'bg-white/90 text-black hover:bg-white border border-black/10'
        }
        ${!isLoggedIn ? 'opacity-60' : ''}
      `}
    >
      {!isLoggedIn && <Lock className="w-2.5 h-2.5 mr-1.5 opacity-50" />}
      {label}
    </button>
  );

  if (!isLoggedIn) {
    return <Tooltip text={disabledReason}>{btn}</Tooltip>;
  }
  return btn;
};

// ---------------------------------------------------------------------------
// Slot box — left panel
// ---------------------------------------------------------------------------
const SlotBox = ({ label, garmentData, onClear, accentColor }) => {
  const filled = !!garmentData;
  return (
    <div className={`
      relative rounded-2xl border transition-all duration-200 backdrop-blur-md px-3 py-2.5
      ${filled
        ? 'bg-white/15 border-white/30'
        : 'bg-white/5 border-white/15 border-dashed'
      }
    `}>
      <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">{label}</p>
      {filled ? (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
          <span className="text-[11px] text-white font-medium truncate max-w-[56px]">
            {garmentData.name ?? label}
          </span>
          <button
            onClick={onClear}
            className="ml-auto text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-white/25 italic">Empty</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Premium add-layer button
// ---------------------------------------------------------------------------
const AddLayerButton = () => (
  <Tooltip text="Multi-layer outfits — coming with Premium">
    <button
      disabled
      className="flex items-center justify-center gap-1.5 w-full rounded-2xl border border-dashed border-white/15 bg-white/5 backdrop-blur-md px-3 py-2 text-[10px] text-white/25 cursor-not-allowed select-none"
    >
      <Plus className="w-3 h-3" />
      Add layer
      <Lock className="w-2.5 h-2.5 ml-0.5 opacity-60" />
    </button>
  </Tooltip>
);

// ---------------------------------------------------------------------------
// SceneOverlay
// ---------------------------------------------------------------------------
const SceneOverlay = ({
  gender,
  hasAnyGarment,
  isProcessing,
  progress,
  error,
  upperGarment,
  lowerGarment,
  onClearUpper,
  onClearLower,
  onReset,
  onRetry,
  onSaveOutfit,
  onPost,
  isLoggedIn,
  mannequinSelected,
  onOpenAuth,       // called when unauthenticated user clicks a gated button
}) => {
  return (
    <>
      {/* ── Top-left: mode badge ── */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm border border-black/8">
          <span className="text-[11px] font-semibold text-black tracking-wide">
            {hasAnyGarment ? 'VIRTUAL TRY-ON' : '3D PREVIEW'}
          </span>
        </div>
      </div>

      {/* ── Top-right: gender badge + reset ── */}
      {gender && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-semibold capitalize">{gender}</span>
          </div>
          <button
            onClick={onReset}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-xl border border-black/10 hover:border-black/30 transition-colors shadow-sm"
            title="Reset mannequin"
          >
            <User className="w-3 h-3 text-black" />
          </button>
        </div>
      )}

      {/* ── Processing ── */}
      {isProcessing && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Generating 3D model...</span>
              {progress > 0 && <span className="text-[10px] text-white/60">{progress}%</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          <span className="text-xs font-medium">{error}</span>
          <button onClick={onRetry} className="p-1 hover:bg-red-400/30 rounded-lg transition-colors">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Pick garment hint ── */}
      {gender && !hasAnyGarment && !isProcessing && !error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-black/8">
          <span className="text-[11px] text-black/60">← Pick a garment from the sidebar</span>
        </div>
      )}

      {/* ══ LEFT — Layer panel ══ */}
      <div
        className={`absolute left-4 bottom-4 z-30 flex flex-col gap-2 transition-all duration-500 ease-out ${
          mannequinSelected
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-4 pointer-events-none'
        }`}
      >
        <AddLayerButton />

        <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-md p-2.5 flex flex-col gap-2 shadow-lg">
          <p className="text-[8px] text-white/30 uppercase tracking-widest px-0.5">Layer 1</p>
          <SlotBox label="Upper" garmentData={upperGarment} onClear={onClearUpper} accentColor="#34d399" />
          <SlotBox label="Lower" garmentData={lowerGarment} onClear={onClearLower} accentColor="#38bdf8" />
        </div>
      </div>

      {/* ══ RIGHT — Action buttons ══ */}
      <div
        className={`absolute right-4 bottom-4 z-30 flex flex-col gap-2 w-40 transition-all duration-500 ease-out ${
          mannequinSelected
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
      >
        <ActionButton
          label="Save Outfit"
          onClick={onSaveOutfit}
          isLoggedIn={isLoggedIn}
          disabledReason="Sign in to save outfits"
          onOpenAuth={onOpenAuth}
          dark={false}
        />
        <ActionButton
          label="Post on Virtrobe"
          onClick={onPost}
          isLoggedIn={isLoggedIn}
          disabledReason="Sign in to post your look"
          onOpenAuth={onOpenAuth}
          dark={true}
        />
      </div>
    </>
  );
};

export default SceneOverlay;