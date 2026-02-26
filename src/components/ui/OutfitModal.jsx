// src/components/ui/OutfitModal.jsx
// Full-screen outfit detail modal — wired to Supabase via useOutfitModal.
// Left 60%: Three.js scene (screenshot texture or live 3D when available).
// Right 40%: submitter info, name, description, tags, likes, scrollable comments.

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { X, Heart, MessageCircle, Tag, Send, Trash2, Ruler } from 'lucide-react';
import { useOutfitModal } from '../../hooks/Useoutfitmodal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const timeAgo = (isoString) => {
  if (!isoString) return '';
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ---------------------------------------------------------------------------
// Three.js scene — screenshot displayed as texture on a plane
// Swap the <mesh> for <MorphableMannequin> + <PhysicsGarment> when wiring
// the full 3D live preview.
// ---------------------------------------------------------------------------
const ModalScene = ({ screenshotUrl, dominantColor }) => {
  const textureRef = useRef(null);

  useEffect(() => {
    if (!screenshotUrl) return;
    const loader = new THREE.TextureLoader();
    loader.load(screenshotUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      textureRef.current = tex;
    });
  }, [screenshotUrl]);

  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.5], fov: 48 }}
      shadows
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}
      style={{ background: '#f8f8f8' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0xf8f8f8, 1);
        scene.background = new THREE.Color(0xf8f8f8);
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 4]} intensity={0.6} castShadow />
      <directionalLight position={[-4, 4, -4]} intensity={0.2} />
      <Environment preset="studio" background={false} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#eeeeee" roughness={0.7} />
      </mesh>

      <Grid
        args={[12, 12]}
        cellSize={0.4}
        cellThickness={0.18}
        cellColor="#d4d4d4"
        sectionColor="#d4d4d4"
        fadeDistance={7}
        position={[0, 0.001, 0]}
      />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.05}
        scale={5}
        blur={5}
        far={2}
      />

      {/* Screenshot plane — centred on mannequin height */}
      {screenshotUrl && (
        <ScreenshotPlane url={screenshotUrl} />
      )}

      {/* Fallback colour block when no screenshot */}
      {!screenshotUrl && (
        <mesh position={[0, 1.1, 0]}>
          <planeGeometry args={[1.2, 1.6]} />
          <meshStandardMaterial
            color={dominantColor ?? '#e0e0e0'}
            transparent
            opacity={0.25}
          />
        </mesh>
      )}

      <OrbitControls
        makeDefault
        target={[0, 1.1, 0]}
        minDistance={1.8}
        maxDistance={5}
        enablePan={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 1.7}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  );
};

// Separate component so texture loads cleanly
const ScreenshotPlane = ({ url }) => {
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    });
  }, [url]);
  if (!texture) return null;
  return (
    <mesh position={[0, 1.1, 0]}>
      <planeGeometry args={[1.35, 1.8]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
const Avatar = ({ url, name, size = 9 }) => (
  <div className={`w-${size} h-${size} rounded-full bg-black/8 flex-shrink-0 flex items-center justify-center overflow-hidden`}>
    {url
      ? <img src={url} alt={name} className="w-full h-full object-cover" />
      : <span className="text-[11px] font-semibold text-black/40 uppercase">{name?.[0] ?? '?'}</span>
    }
  </div>
);

// ---------------------------------------------------------------------------
// Tag chip
// ---------------------------------------------------------------------------
const TagChip = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/10 text-[10px] text-black/45 bg-black/[0.02] hover:border-black/25 transition-colors cursor-default">
    <Tag className="w-2.5 h-2.5" />
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// Measurement row (from measurements_snapshot)
// ---------------------------------------------------------------------------
const MeasurementRow = ({ label, value, unit = 'cm' }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-black/[0.05] last:border-0">
      <span className="text-[10px] text-black/35 uppercase tracking-wide">{label}</span>
      <span className="text-[11px] text-black/70 font-medium tabular-nums">{value} {unit}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Comment bubble
// ---------------------------------------------------------------------------
const CommentBubble = ({ comment, currentUserId, onDelete }) => {
  const isOwn = comment.author?.id === currentUserId;
  return (
    <div className="flex gap-2.5 py-3 border-b border-black/[0.05] last:border-0 group">
      <Avatar url={comment.author?.avatar_url} name={comment.author?.display_name} size={7} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-black leading-none">
              {comment.author?.display_name ?? 'Unknown'}
            </span>
            <span className="text-[9px] text-black/25">
              @{comment.author?.username}
            </span>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-black/20">{timeAgo(comment.created_at)}</span>
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-black/20 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-[12px] text-black/65 leading-relaxed">{comment.content}</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
const Skeleton = ({ className }) => (
  <div className={`bg-black/[0.06] rounded animate-pulse ${className}`} />
);

// ---------------------------------------------------------------------------
// OutfitModal
// ---------------------------------------------------------------------------
const OutfitModal = ({ submissionId, onClose, currentUser }) => {
  const currentUserId = currentUser?.id ?? null;

  const {
    submission,
    comments,
    liked,
    likeCount,
    loading,
    error,
    toggleLike,
    postComment,
    deleteComment,
  } = useOutfitModal(submissionId, currentUserId);

  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'measurements'
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll to latest comment
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await postComment(commentText);
    setCommentText('');
  };

  const outfit      = submission?.outfit ?? null;
  const submitter   = submission?.submitter ?? null;
  const measurements = outfit?.measurements_snapshot ?? null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-6xl h-[88vh] max-h-[800px] bg-white rounded-3xl overflow-hidden shadow-2xl flex">

        {/* ══ LEFT: 3D scene (60%) ══ */}
        <div className="relative w-[60%] flex-shrink-0 bg-[#f8f8f8]">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
            </div>
          ) : (
            <ModalScene
              screenshotUrl={outfit?.screenshot_signed_url}
              dominantColor={outfit?.dominant_color}
            />
          )}

          {/* Floating label bottom-left */}
          {!loading && (
            <div className="absolute bottom-5 left-6 right-6 pointer-events-none">
              <p className="text-black/25 text-[9px] tracking-[0.3em] uppercase mb-1" style={serif}>
                Virtual Try-On
              </p>
              <p className="text-black text-2xl font-light leading-tight" style={serif}>
                {outfit?.name ?? 'Untitled Look'}
              </p>
            </div>
          )}

          {/* Orbit hint */}
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-black/8">
            <span className="text-[9px] text-black/35 tracking-wide">Drag to orbit</span>
          </div>
        </div>

        {/* Thin divider */}
        <div className="w-px bg-black/6 flex-shrink-0" />

        {/* ══ RIGHT: details + tabs + comments (40%) ══ */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* ── Header ── */}
          <div className="flex-shrink-0 px-7 pt-6 pb-5 border-b border-black/6">

            {/* Submitter row + close */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {loading ? (
                  <>
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="w-24 h-3 rounded" />
                      <Skeleton className="w-16 h-2.5 rounded" />
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar url={submitter?.avatar_url} name={submitter?.display_name} size={9} />
                    <div>
                      <p className="text-[13px] font-semibold text-black leading-none">
                        {submitter?.display_name ?? 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-black/30 mt-0.5">
                        @{submitter?.username ?? '—'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-black/5 text-black/25 hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Name */}
            {loading ? (
              <Skeleton className="w-48 h-7 rounded mb-3" />
            ) : (
              <h2 className="text-[1.6rem] font-light text-black mb-2 leading-tight" style={serif}>
                {outfit?.name ?? 'Untitled Look'}
              </h2>
            )}

            {/* Description */}
            {loading ? (
              <Skeleton className="w-full h-3.5 rounded mb-1" />
            ) : outfit?.description ? (
              <p className="text-[12px] text-black/45 leading-relaxed mb-3">
                {outfit.description}
              </p>
            ) : null}

            {/* Tags */}
            {!loading && outfit?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {outfit.tags.map((tag) => <TagChip key={tag} label={tag} />)}
              </div>
            )}

            {/* Like + comment counts */}
            <div className="flex items-center gap-5 mt-1">
              <button
                onClick={currentUserId ? toggleLike : undefined}
                title={!currentUserId ? 'Sign in to like' : undefined}
                className={`flex items-center gap-1.5 transition-all active:scale-90 ${
                  liked ? 'text-black' : 'text-black/25 hover:text-black/60'
                } ${!currentUserId ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <Heart
                  className="w-4 h-4 transition-all duration-200"
                  fill={liked ? 'currentColor' : 'none'}
                  strokeWidth={liked ? 0 : 1.5}
                />
                <span className="text-[11px] font-medium tabular-nums">{likeCount}</span>
              </button>

              <button
                onClick={() => { setActiveTab('comments'); inputRef.current?.focus(); }}
                className="flex items-center gap-1.5 text-black/25 hover:text-black/60 transition-colors"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[11px] font-medium tabular-nums">{comments.length}</span>
              </button>

              {/* Tab switcher pushed to right */}
              <div className="ml-auto flex items-center gap-0.5 bg-black/[0.04] rounded-lg p-0.5">
                {['comments', 'measurements'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-white text-black shadow-sm'
                        : 'text-black/30 hover:text-black/60'
                    }`}
                  >
                    {tab === 'measurements' ? <Ruler className="w-3 h-3" /> : tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto min-h-0 px-7 py-4">

            {/* COMMENTS TAB */}
            {activeTab === 'comments' && (
              <>
                {loading ? (
                  <div className="flex flex-col gap-4 pt-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-2.5">
                        <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <Skeleton className="w-24 h-2.5 rounded" />
                          <Skeleton className="w-full h-3 rounded" />
                          <Skeleton className="w-3/4 h-3 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full pb-8 opacity-25 select-none">
                    <MessageCircle className="w-8 h-8 text-black/20 mb-2" strokeWidth={1} />
                    <p className="text-[11px] text-black/30">No comments yet — be first</p>
                  </div>
                ) : (
                  <>
                    {comments.map((c) => (
                      <CommentBubble
                        key={c.id}
                        comment={c}
                        currentUserId={currentUserId}
                        onDelete={deleteComment}
                      />
                    ))}
                    <div ref={commentsEndRef} />
                  </>
                )}
              </>
            )}

            {/* MEASUREMENTS TAB */}
            {activeTab === 'measurements' && (
              <div className="py-2">
                {!measurements ? (
                  <p className="text-[11px] text-black/30 text-center py-8">
                    No measurements saved with this outfit.
                  </p>
                ) : (
                  <>
                    <p className="text-[9px] text-black/25 uppercase tracking-widest mb-4">
                      Body snapshot at time of save
                    </p>
                    <div className="space-y-0.5">
                      <MeasurementRow label="Gender"     value={measurements.gender} unit="" />
                      <MeasurementRow label="Height"     value={measurements.height_cm} />
                      <MeasurementRow label="Weight"     value={measurements.weight_kg} unit="kg" />
                      <MeasurementRow label="Bust"       value={measurements.bust_cm} />
                      <MeasurementRow label="Waist"      value={measurements.waist_cm} />
                      <MeasurementRow label="Hips"       value={measurements.hips_cm} />
                      <MeasurementRow label="Shoulders"  value={measurements.shoulder_width_cm} />
                      <MeasurementRow label="BMI"        value={measurements.bmi} unit="" />
                    </div>

                    {outfit?.garment_type && (
                      <div className="mt-5 pt-4 border-t border-black/6">
                        <p className="text-[9px] text-black/25 uppercase tracking-widest mb-2">Garment</p>
                        <p className="text-[12px] text-black/60 capitalize">{outfit.garment_type}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Comment input — pinned bottom ── */}
          <div className="flex-shrink-0 border-t border-black/6 px-7 py-4">
            {error && (
              <p className="text-[10px] text-red-400 mb-2">{error}</p>
            )}
            {currentUser ? (
              <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
                <Avatar url={currentUser.avatar_url} name={currentUser.display_name ?? currentUser.username} size={7} />
                <input
                  ref={inputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  maxLength={500}
                  className="flex-1 bg-black/[0.03] rounded-xl px-4 py-2.5 text-[12px] text-black placeholder:text-black/20 outline-none border border-transparent focus:border-black/12 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="p-2.5 rounded-xl bg-black text-white hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <p className="text-center text-[11px] text-black/25 py-0.5">
                Sign in to leave a comment
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitModal;