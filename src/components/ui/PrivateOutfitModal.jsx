// src/components/ui/PrivateOutfitModal.jsx
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { X, Tag, Ruler, Calendar, Lock, Globe, Loader2 } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '../../services/authService';
import { STORAGE_BUCKET } from '../../lib/supabase'; // ← import shared bucket constant
import MorphableMannequin from '../3d/MorphableMannequin';
import PhysicsGarment from '../3d/PhysicsGarment';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const mono  = { fontFamily: "'DM Mono', 'Courier New', monospace" };

const fmtDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const MeasRow = ({ label, value, unit = 'cm' }) =>
    value ? (
        <div className="flex items-center justify-between py-1.5 border-b border-black/[0.05] last:border-0">
            <span className="text-[10px] text-black/35 uppercase tracking-wide">{label}</span>
            <span className="text-[11px] text-black/70 font-medium tabular-nums">{value} {unit}</span>
        </div>
    ) : null;

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

const Live3DScene = ({ measurements, upperTemplate, lowerTemplate, screenshotUrl }) => {
    const mannequinRef = useRef();
    const has3D = measurements && (upperTemplate?.modelUrl || lowerTemplate?.modelUrl);

    const upperGarmentData = upperTemplate?.modelUrl ? {
        id: upperTemplate.id, name: upperTemplate.name,
        type: upperTemplate.type, modelUrl: upperTemplate.modelUrl, slot: 'upper',
    } : null;

    const lowerGarmentData = lowerTemplate?.modelUrl ? {
        id: lowerTemplate.id, name: lowerTemplate.name,
        type: lowerTemplate.type, modelUrl: lowerTemplate.modelUrl, slot: 'lower',
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
            <Grid args={[12, 12]} cellSize={0.4} cellThickness={0.18}
                cellColor="#d4d4d4" sectionColor="#d4d4d4"
                fadeDistance={7} position={[0, 0.001, 0]} />
            <ContactShadows position={[0, 0.001, 0]} opacity={0.05} scale={5} blur={5} far={2} />

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
                                key={`upper-priv-${upperGarmentData.id}`}
                                garmentData={upperGarmentData}
                                measurements={measurements}
                                mannequinRef={mannequinRef}
                                slot="upper" layer={0}
                            />
                        </Suspense>
                    )}
                    {lowerGarmentData && mannequinRef && (
                        <Suspense fallback={null}>
                            <PhysicsGarment
                                key={`lower-priv-${lowerGarmentData.id}`}
                                garmentData={lowerGarmentData}
                                measurements={measurements}
                                mannequinRef={mannequinRef}
                                slot="lower" layer={0}
                            />
                        </Suspense>
                    )}
                </group>
            ) : (
                <ScreenshotPlane url={screenshotUrl} />
            )}

            <OrbitControls makeDefault target={[0, 1.1, 0]}
                minDistance={1.8} maxDistance={5} enablePan={false}
                minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 1.7}
                autoRotate autoRotateSpeed={0.5} />
        </Canvas>
    );
};

const PrivateOutfitModal = ({ outfit, onClose }) => {
    const [loading, setLoading]           = useState(true);
    const [screenshotUrl, setScreenshotUrl] = useState(null);
    const [fullOutfit, setFullOutfit]     = useState(null);
    const [upperTemplate, setUpperTemplate] = useState(null);
    const [lowerTemplate, setLowerTemplate] = useState(null);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const resolveTemplate = useCallback(async (templateId) => {
        if (!templateId) return null;
        const { data: tmpl, error: tErr } = await supabase
            .from('garment_templates')
            .select('id, name, type, glb_path, dominant_color') // ← was model_url
            .eq('id', templateId)
            .maybeSingle();                                      // ← was .single()
        if (tErr || !tmpl) return null;

        let modelUrl = tmpl.glb_path;                           // ← was tmpl.model_url
        if (modelUrl && !modelUrl.startsWith('http')) {
            const { data: signed } = await supabase.storage
                .from(STORAGE_BUCKET)                           // ← was hardcoded 'garment-models'
                .createSignedUrl(modelUrl, 3600);
            modelUrl = signed?.signedUrl ?? null;
        }
        return { ...tmpl, modelUrl };
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('outfits')
                    .select(`
                        id, name, description, tags, is_public,
                        screenshot_url, saved_at, garment_type,
                        dominant_color, measurements_snapshot,
                        upper_template_id, lower_template_id
                    `)
                    .eq('id', outfit.id)
                    .single();

                if (error) throw error;
                setFullOutfit(data);

                if (data.screenshot_url) {
                    const { data: signed } = await supabase.storage
                        .from('moodboard-screenshots')
                        .createSignedUrl(data.screenshot_url, 3600);
                    setScreenshotUrl(signed?.signedUrl ?? null);
                } else if (outfit.screenshotSignedUrl) {
                    setScreenshotUrl(outfit.screenshotSignedUrl);
                }

                const [upper, lower] = await Promise.all([
                    resolveTemplate(data.upper_template_id),
                    resolveTemplate(data.lower_template_id),
                ]);
                setUpperTemplate(upper);
                setLowerTemplate(lower);

                if (upper) setFullOutfit(prev => ({ ...prev, upperTemplateName: upper.name, upperTemplateType: upper.type }));
                if (lower) setFullOutfit(prev => ({ ...prev, lowerTemplateName: lower.name, lowerTemplateType: lower.type }));
            } catch (err) {
                console.error('Failed to load outfit:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [outfit.id, resolveTemplate]);

    const meas = fullOutfit?.measurements_snapshot ?? null;
    const src  = screenshotUrl ?? outfit.screenshotSignedUrl;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
            <div className="relative z-10 w-full max-w-5xl h-[85vh] max-h-[750px] bg-white rounded-3xl overflow-hidden shadow-2xl flex">

                {/* LEFT: 3D scene */}
                <div className="relative w-[55%] flex-shrink-0 bg-[#f8f8f8]">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <Live3DScene measurements={meas} upperTemplate={upperTemplate}
                            lowerTemplate={lowerTemplate} screenshotUrl={src} />
                    )}

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
                    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-black/8">
                        <span className="text-[9px] text-black/35 tracking-wide">Drag to orbit</span>
                    </div>
                </div>

                <div className="w-px bg-black/6 flex-shrink-0" />

                {/* RIGHT: details */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-black/6 flex-shrink-0">
                        <div>
                            <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-1" style={serif}>Saved outfit</p>
                            <h2 className="text-xl font-light text-black" style={serif}>
                                {loading ? '...' : (fullOutfit?.name ?? outfit.name ?? 'Untitled Look')}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-7 py-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 text-black/20 animate-spin" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-3 text-[10px] text-black/35">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span style={mono}>{fmtDate(fullOutfit?.saved_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {fullOutfit?.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                        <span>{fullOutfit?.is_public ? 'Public' : 'Private'}</span>
                                    </div>
                                </div>

                                {fullOutfit?.description && (
                                    <p className="text-[12px] text-black/50 leading-relaxed" style={serif}>{fullOutfit.description}</p>
                                )}

                                {fullOutfit?.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {fullOutfit.tags.map((t) => (
                                            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/10 text-[10px] text-black/45 bg-black/[0.02]">
                                                <Tag className="w-2.5 h-2.5" />{t}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {(fullOutfit?.upperTemplateName || fullOutfit?.lowerTemplateName) && (
                                    <div className="pt-2 border-t border-black/6">
                                        <p className="text-[9px] text-black/25 uppercase tracking-widest mb-3">Garments</p>
                                        {fullOutfit.upperTemplateName && (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-[10px] text-black/35 uppercase tracking-wide">Upper</span>
                                                <span className="text-[11px] text-black/70">{fullOutfit.upperTemplateName}</span>
                                            </div>
                                        )}
                                        {fullOutfit.lowerTemplateName && (
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-[10px] text-black/35 uppercase tracking-wide">Lower</span>
                                                <span className="text-[11px] text-black/70">{fullOutfit.lowerTemplateName}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {meas && (
                                    <div className="pt-2 border-t border-black/6">
                                        <p className="text-[9px] text-black/25 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                            <Ruler className="w-3 h-3" /> Body snapshot at time of save
                                        </p>
                                        <MeasRow label="Gender"    value={meas.gender}           unit="" />
                                        <MeasRow label="Height"    value={meas.height_cm} />
                                        <MeasRow label="Weight"    value={meas.weight_kg}         unit="kg" />
                                        <MeasRow label="Bust"      value={meas.bust_cm} />
                                        <MeasRow label="Waist"     value={meas.waist_cm} />
                                        <MeasRow label="Hips"      value={meas.hips_cm} />
                                        <MeasRow label="Shoulders" value={meas.shoulder_width_cm} />
                                        <MeasRow label="BMI"       value={meas.bmi}               unit="" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivateOutfitModal;