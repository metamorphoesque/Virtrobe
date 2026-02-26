// src/components/ui/OutfitModal.jsx
// Full-screen outfit modal.
// LEFT 60%: live Three.js scene reconstructed from saved template IDs + measurements.
//           Falls back to screenshot texture if templates unavailable.
// RIGHT 40%: submitter, name, description, tags, likes, scrollable comments.

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { X, Heart, MessageCircle, Tag, Send, Trash2, Ruler } from 'lucide-react';
import { useOutfitModal } from '../../hooks/useOutfitModal';

// Reuse the project's existing 3D components
import MorphableMannequin from '../3d/MorphableMannequin';
import PhysicsGarment     from '../3d/PhysicsGarment';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ---------------------------------------------------------------------------
// ScreenshotPlane — fallback when no GLB available
// ---------------------------------------------------------------------------
const ScreenshotPlane = ({ url }) => {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!url) return;
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    });
  }, [url]);
  if (!tex) return null;
  return (
    <mesh position={[0, 1.1, 0]}>
      <planeGeometry args={[1.35, 1.8]} />
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Live3DScene — reconstructs the exact saved mannequin + garments
// ---------------------------------------------------------------------------
const Live3DScene = ({ measurements, upperTemplate, lowerTemplate, screenshotUrl }) => {
  const mannequinRef = useRef();
  const has3D = measurements && (upperTemplate?.modelUrl || lowerTemplate?.modelUrl);

  const upperGarmentData = upperTemplate?.modelUrl ? {
    id:       upperTemplate.id,
    name:     upperTemplate.name,
    type:     upperTemplate.type,
    modelUrl: upperTemplate.modelUrl,
    slot:     'upper',
  } : null;

  const lowerGarmentData = lowerTemplate?.modelUrl ? {
    id:       lowerTemplate.id,
    name:     lowerTemplate.name,
    type:     lowerTemplate.type,
    modelUrl: lowerTemplate.modelUrl,
    slot:     'lower',
  } : null;

  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.6], fov: 48 }}
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

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#eeeeee" roughness={0.7} />
      </mesh>

      <Grid
        args={[12, 12]} cellSize={0.4} cellThickness={0.18}
        cellColor="#d4d4d4" sectionColor="#d4d4d4"
        fadeDistance={7} position={[0, 0.001, 0]}
      />

      <ContactShadows position={[0, 0.001, 0]} opacity={0.05} scale={5} blur={5} far={2} />

      {/* ── Live 3D reconstruction ── */}
      {has3D ? (
        <group rotation={[0, Math.PI / 2, 0]}>
          <Suspense fallback={null}>
            <MorphableMannequin
              ref={mannequinRef}
              measurements={measurements}
              autoRotate={false}
              standHeight={((measurements.height_cm ?? 170) / 100) * 0.45 - 0.2}
            />
          </Suspense>

          {upperGarmentData && mannequinRef && (
            <Suspense fallback={null}>
              <PhysicsGarment
                key={`upper-modal-${upperGarmentData.id}`}
                garmentData={upperGarmentData}
                measurements={measurements}
                mannequinRef={mannequinRef}
                slot="upper"
                layer={0}
              />
            </Suspense>
          )}

          {lowerGarmentData && mannequinRef && (
            <Suspense fallback={null}>
              <PhysicsGarment
                key={`lower-modal-${lowerGarmentData.id}`}
                garmentData={lowerGarmentData}
                measurements={measurements}
                mannequinRef={mannequinRef}
                slot="lower"
                layer={0}
              />
            </Suspense>
          )}
        </group>
      ) : (
        /* Screenshot fallback */
        <ScreenshotPlane url={screenshotUrl} />
      )}

      <OrbitControls
        makeDefault target={[0, 1.1, 0]}
        minDistance={1.8} maxDistance={5}
        enablePan={false}
        minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 1.7}
        autoRotate autoRotateSpeed={0.5}
      />
    </Canvas>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const Avatar = ({ url, name, size = 9 }) => (
  <div className={`w-${size} h-${size} rounded-full bg-black/8 flex-shrink-0 flex items-center justify-center overflow-hidden`}>
    {url
      ? <img src={url} alt={name} className="w-full h-full object-cover" />
      : <span className="text-[11px] font-semibold text-black/40 uppercase">{name?.[0] ?? '?'}</span>
    }
  </div>
);

const TagChip = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/10 text-[10px] text-black/45 bg-black/[0.02]">
    <Tag className="w-2.5 h-2.5" />{label}
  </span>
);

const MeasRow = ({ label, value, unit = 'cm' }) =>
  value ? (
    <div className="flex items-center justify-between py-1.5 border-b border-black/[0.05] last:border-0">
      <span className="text-[10px] text-black/35 uppercase tracking-wide">{label}</span>
      <span className="text-[11px] text-black/70 font-medium tabular-nums">{value} {unit}</span>
    </div>
  ) : null;

const CommentBubble = ({ comment, currentUserId, onDelete }) => (
  <div className="flex gap-2.5 py-3 border-b border-black/[0.05] last:border-0 group">
    <Avatar url={comment.author?.avatar_url} name={comment.author?.display_name} size={7} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold text-black">{comment.author?.display_name ?? 'Unknown'}</span>
          <span className="text-[9px] text-black/25">@{comment.author?.username}</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] text-black/20">{timeAgo(comment.created_at)}</span>
          {comment.author?.id === currentUserId && (
            <button onClick={() => onDelete(comment.id)} className="text-black/20 hover:text-red-400 transition-colors">
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-[12px] text-black/65 leading-relaxed">{comment.content}</p>
    </div>
  </div>
);

const Skeleton = ({ className }) => <div className={`bg-black/[0.06] rounded animate-pulse ${className}`} />;

// ---------------------------------------------------------------------------
// OutfitModal
// ---------------------------------------------------------------------------
const OutfitModal = ({ submissionId, onClose, currentUser }) => {
  const currentUserId = currentUser?.id ?? null;

  const {
    submission, upperTemplate, lowerTemplate,
    comments, liked, likeCount, loading, error,
    toggleLike, postComment, deleteComment,
  } = useOutfitModal(submissionId, currentUserId);

  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab]     = useState('comments');
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await postComment(commentText);
    setCommentText('');
  };

  const outfit      = submission?.outfit ?? null;
  const submitter   = submission?.submitter ?? null;
  const meas        = outfit?.measurements_snapshot ?? null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl h-[88vh] max-h-[800px] bg-white rounded-3xl overflow-hidden shadow-2xl flex">

        {/* ══ LEFT: 3D scene (60%) ══ */}
        <div className="relative w-[60%] flex-shrink-0 bg-[#f8f8f8]">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
            </div>
          ) : (
            <Live3DScene
              measurements={meas}
              upperTemplate={upperTemplate}
              lowerTemplate={lowerTemplate}
              screenshotUrl={outfit?.screenshotSignedUrl}
            />
          )}

          {/* Garment name badges — bottom left */}
          {!loading && (upperTemplate || lowerTemplate) && (
            <div className="absolute bottom-5 left-5 flex flex-col gap-1.5 pointer-events-none">
              {upperTemplate && (
                <div className="bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-black/8">
                  <span className="text-[9px] text-black/50 uppercase tracking-wide">Upper · </span>
                  <span className="text-[10px] text-black font-medium">{upperTemplate.name}</span>
                </div>
              )}
              {lowerTemplate && (
                <div className="bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-black/8">
                  <span className="text-[9px] text-black/50 uppercase tracking-wide">Lower · </span>
                  <span className="text-[10px] text-black font-medium">{lowerTemplate.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Outfit name floating */}
          {!loading && outfit?.name && (
            <div className="absolute bottom-5 right-5 text-right pointer-events-none">
              <p className="text-black/20 text-[8px] tracking-[0.3em] uppercase mb-0.5" style={serif}>Look</p>
              <p className="text-black text-lg font-light leading-tight" style={serif}>{outfit.name}</p>
            </div>
          )}

          {/* Orbit hint */}
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-black/8">
            <span className="text-[9px] text-black/35 tracking-wide">Drag to orbit</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-black/6 flex-shrink-0" />

        {/* ══ RIGHT: details + comments (40%) ══ */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Header */}
          <div className="flex-shrink-0 px-7 pt-6 pb-5 border-b border-black/6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {loading ? (
                  <><Skeleton className="w-9 h-9 rounded-full" /><div className="flex flex-col gap-1"><Skeleton className="w-24 h-3 rounded" /><Skeleton className="w-16 h-2.5 rounded" /></div></>
                ) : (
                  <><Avatar url={submitter?.avatar_url} name={submitter?.display_name} size={9} />
                  <div>
                    <p className="text-[13px] font-semibold text-black leading-none">{submitter?.display_name ?? 'Anonymous'}</p>
                    <p className="text-[10px] text-black/30 mt-0.5">@{submitter?.username ?? '—'}</p>
                  </div></>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 text-black/25 hover:text-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading
              ? <Skeleton className="w-48 h-7 rounded mb-3" />
              : <h2 className="text-[1.6rem] font-light text-black mb-2 leading-tight" style={serif}>{outfit?.name ?? 'Untitled Look'}</h2>
            }

            {loading
              ? <Skeleton className="w-full h-3.5 rounded mb-3" />
              : outfit?.description && <p className="text-[12px] text-black/45 leading-relaxed mb-3">{outfit.description}</p>
            }

            {!loading && outfit?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {outfit.tags.map((t) => <TagChip key={t} label={t} />)}
              </div>
            )}

            {/* Like + comment counts + tab switcher */}
            <div className="flex items-center gap-5 mt-1">
              <button
                onClick={currentUserId ? toggleLike : undefined}
                className={`flex items-center gap-1.5 transition-all active:scale-90 ${liked ? 'text-black' : 'text-black/25 hover:text-black/60'} ${!currentUserId ? 'cursor-default' : ''}`}
              >
                <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 1.5} />
                <span className="text-[11px] font-medium tabular-nums">{likeCount}</span>
              </button>
              <button onClick={() => { setActiveTab('comments'); inputRef.current?.focus(); }} className="flex items-center gap-1.5 text-black/25 hover:text-black/60 transition-colors">
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[11px] font-medium tabular-nums">{comments.length}</span>
              </button>
              <div className="ml-auto flex items-center gap-0.5 bg-black/[0.04] rounded-lg p-0.5">
                {['comments', 'measurements'].map((t) => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all capitalize ${activeTab === t ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'}`}
                  >
                    {t === 'measurements' ? <Ruler className="w-3 h-3" /> : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-7 py-4">

            {activeTab === 'comments' && (
              loading ? (
                <div className="flex flex-col gap-4 pt-2">
                  {[1,2,3].map((i) => <div key={i} className="flex gap-2.5"><Skeleton className="w-7 h-7 rounded-full flex-shrink-0" /><div className="flex-1 flex flex-col gap-1.5"><Skeleton className="w-24 h-2.5 rounded" /><Skeleton className="w-full h-3 rounded" /></div></div>)}
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full pb-8 opacity-25 select-none">
                  <MessageCircle className="w-8 h-8 text-black/20 mb-2" strokeWidth={1} />
                  <p className="text-[11px] text-black/30">No comments yet</p>
                </div>
              ) : (
                <>
                  {comments.map((c) => <CommentBubble key={c.id} comment={c} currentUserId={currentUserId} onDelete={deleteComment} />)}
                  <div ref={commentsEndRef} />
                </>
              )
            )}

            {activeTab === 'measurements' && (
              <div className="py-2">
                {!meas ? (
                  <p className="text-[11px] text-black/30 text-center py-8">No measurements saved with this outfit.</p>
                ) : (
                  <>
                    <p className="text-[9px] text-black/25 uppercase tracking-widest mb-4">Body snapshot at time of save</p>
                    <MeasRow label="Gender"    value={meas.gender}              unit="" />
                    <MeasRow label="Height"    value={meas.height_cm} />
                    <MeasRow label="Weight"    value={meas.weight_kg}           unit="kg" />
                    <MeasRow label="Bust"      value={meas.bust_cm} />
                    <MeasRow label="Waist"     value={meas.waist_cm} />
                    <MeasRow label="Hips"      value={meas.hips_cm} />
                    <MeasRow label="Shoulders" value={meas.shoulder_width_cm} />
                    <MeasRow label="BMI"       value={meas.bmi}                 unit="" />
                    {/* Garment labels */}
                    {(upperTemplate || lowerTemplate) && (
                      <div className="mt-5 pt-4 border-t border-black/6">
                        <p className="text-[9px] text-black/25 uppercase tracking-widest mb-3">Garments</p>
                        {upperTemplate && <div className="flex justify-between py-1.5"><span className="text-[10px] text-black/35 uppercase tracking-wide">Upper</span><span className="text-[11px] text-black/70">{upperTemplate.name}</span></div>}
                        {lowerTemplate && <div className="flex justify-between py-1.5"><span className="text-[10px] text-black/35 uppercase tracking-wide">Lower</span><span className="text-[11px] text-black/70">{lowerTemplate.name}</span></div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Comment input */}
          <div className="flex-shrink-0 border-t border-black/6 px-7 py-4">
            {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
            {currentUser ? (
              <form onSubmit={handleComment} className="flex items-center gap-3">
                <Avatar url={currentUser.avatar_url} name={currentUser.display_name ?? currentUser.username} size={7} />
                <input
                  ref={inputRef}
                  type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…" maxLength={500}
                  className="flex-1 bg-black/[0.03] rounded-xl px-4 py-2.5 text-[12px] text-black placeholder:text-black/20 outline-none border border-transparent focus:border-black/12 transition-colors"
                />
                <button type="submit" disabled={!commentText.trim()} className="p-2.5 rounded-xl bg-black text-white hover:bg-black/80 disabled:opacity-20 transition-all active:scale-90">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <p className="text-center text-[11px] text-black/25 py-0.5">Sign in to leave a comment</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitModal;