// src/components/ui/PrivateOutfitModal.jsx
// Detail modal for private outfits (no public submission).
// Shows screenshot preview, outfit name, description, tags, date, and measurements.

import React, { useState, useEffect } from 'react';
import { X, Tag, Ruler, Calendar, Lock, Globe, Loader2 } from 'lucide-react';
import { supabase } from '../../services/authService';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const mono = { fontFamily: "'DM Mono', 'Courier New', monospace" };

const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
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

const PrivateOutfitModal = ({ outfit, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [screenshotUrl, setScreenshotUrl] = useState(null);
    const [fullOutfit, setFullOutfit] = useState(null);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch full outfit data
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

                // Resolve screenshot URL
                if (data.screenshot_url) {
                    const { data: signed } = await supabase.storage
                        .from('moodboard-screenshots')
                        .createSignedUrl(data.screenshot_url, 3600);
                    setScreenshotUrl(signed?.signedUrl ?? null);
                } else if (outfit.screenshotSignedUrl) {
                    setScreenshotUrl(outfit.screenshotSignedUrl);
                }

                // Resolve template names
                if (data.upper_template_id) {
                    const { data: t } = await supabase
                        .from('garment_templates').select('name, type').eq('id', data.upper_template_id).single();
                    if (t) setFullOutfit(prev => ({ ...prev, upperTemplateName: t.name, upperTemplateType: t.type }));
                }
                if (data.lower_template_id) {
                    const { data: t } = await supabase
                        .from('garment_templates').select('name, type').eq('id', data.lower_template_id).single();
                    if (t) setFullOutfit(prev => ({ ...prev, lowerTemplateName: t.name, lowerTemplateType: t.type }));
                }
            } catch (err) {
                console.error('Failed to load outfit:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [outfit.id]);

    const meas = fullOutfit?.measurements_snapshot ?? null;
    const src = screenshotUrl ?? outfit.screenshotSignedUrl;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />

            <div className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-black/6 flex-shrink-0">
                    <div>
                        <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-1" style={serif}>
                            Saved outfit
                        </p>
                        <h2 className="text-xl font-light text-black" style={serif}>
                            {loading ? '...' : (fullOutfit?.name ?? outfit.name ?? 'Untitled Look')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-black/20 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row">
                            {/* Screenshot */}
                            <div className="md:w-1/2 flex-shrink-0 bg-[#f8f8f8] flex items-center justify-center p-6">
                                {src ? (
                                    <img
                                        src={src}
                                        alt={fullOutfit?.name ?? 'Outfit'}
                                        className="w-full max-h-[400px] object-contain rounded-xl shadow-sm"
                                    />
                                ) : (
                                    <div className="w-full aspect-[3/4] bg-black/[0.04] rounded-xl flex items-center justify-center">
                                        <svg viewBox="0 0 60 100" className="w-16 opacity-15" fill="currentColor">
                                            <circle cx="30" cy="14" r="10" />
                                            <path d="M14 30 Q14 24 30 24 Q46 24 46 30 L50 70 Q50 72 48 72 L38 72 L36 100 L24 100 L22 72 L12 72 Q10 72 10 70 Z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="md:w-1/2 px-7 py-6 flex flex-col gap-5">

                                {/* Meta row */}
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

                                {/* Description */}
                                {fullOutfit?.description && (
                                    <p className="text-[12px] text-black/50 leading-relaxed" style={serif}>
                                        {fullOutfit.description}
                                    </p>
                                )}

                                {/* Tags */}
                                {fullOutfit?.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {fullOutfit.tags.map((t) => (
                                            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/10 text-[10px] text-black/45 bg-black/[0.02]">
                                                <Tag className="w-2.5 h-2.5" />{t}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Garments */}
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

                                {/* Measurements */}
                                {meas && (
                                    <div className="pt-2 border-t border-black/6">
                                        <p className="text-[9px] text-black/25 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                            <Ruler className="w-3 h-3" /> Body snapshot at time of save
                                        </p>
                                        <MeasRow label="Gender" value={meas.gender} unit="" />
                                        <MeasRow label="Height" value={meas.height_cm} />
                                        <MeasRow label="Weight" value={meas.weight_kg} unit="kg" />
                                        <MeasRow label="Bust" value={meas.bust_cm} />
                                        <MeasRow label="Waist" value={meas.waist_cm} />
                                        <MeasRow label="Hips" value={meas.hips_cm} />
                                        <MeasRow label="Shoulders" value={meas.shoulder_width_cm} />
                                        <MeasRow label="BMI" value={meas.bmi} unit="" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrivateOutfitModal;
