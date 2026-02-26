// src/hooks/useSaveOutfit.js
// Handles the full save flow:
//   1. Captures the Three.js canvas as a PNG blob
//   2. Uploads screenshot to Supabase storage
//   3. Inserts outfit row with template IDs + measurements snapshot
//   4. Optionally inserts into public_submissions

import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// Capture the Three.js <canvas> as a PNG blob.
// glRef should be the `gl` object from useThree(), or the Canvas's gl.domElement.
// Falls back to querySelector if no ref passed.
// ---------------------------------------------------------------------------
export const captureCanvas = (canvasEl) => {
  return new Promise((resolve, reject) => {
    if (!canvasEl) {
      // Try to find the canvas in the DOM
      canvasEl = document.querySelector('canvas');
    }
    if (!canvasEl) return reject(new Error('No canvas element found'));

    // preserveDrawingBuffer must be true in Canvas props (it already is)
    canvasEl.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas toBlob returned null'));
      resolve(blob);
    }, 'image/png', 0.92);
  });
};

// ---------------------------------------------------------------------------
// useSaveOutfit
// ---------------------------------------------------------------------------
export const useSaveOutfit = (user) => {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const saveOutfit = useCallback(async ({
    name,               // string
    description,        // string
    tags,               // string[]
    isPublic,           // boolean
    measurements,       // full measurements object
    upperTemplateId,    // uuid | null
    lowerTemplateId,    // uuid | null
    canvasEl,           // HTMLCanvasElement — the Three.js canvas
  }) => {
    if (!user) throw new Error('Must be signed in to save an outfit');

    setSaving(true);
    setError(null);

    try {
      // ── 1. Capture screenshot ──────────────────────────────────────────
      let screenshotPath = null;
      try {
        const blob = await captureCanvas(canvasEl);
        const filename = `${user.id}/${Date.now()}.png`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('moodboard-screenshots')
          .upload(filename, blob, { contentType: 'image/png', upsert: false });
        if (uploadErr) throw uploadErr;
        screenshotPath = uploadData.path;
      } catch (screenshotErr) {
        // Non-fatal — outfit still saves without a screenshot
        console.warn('Screenshot capture failed:', screenshotErr);
      }

      // ── 2. Insert outfit row ───────────────────────────────────────────
      const { data: outfit, error: outfitErr } = await supabase
        .from('outfits')
        .insert({
          user_id:               user.id,
          name:                  name.trim(),
          description:           description?.trim() || null,
          tags:                  tags ?? [],
          is_public:             isPublic,
          upper_template_id:     upperTemplateId ?? null,
          lower_template_id:     lowerTemplateId ?? null,
          measurements_snapshot: measurements,
          screenshot_url:        screenshotPath,
          saved_at:              new Date().toISOString(),
        })
        .select('id')
        .single();

      if (outfitErr) throw outfitErr;

      // ── 3. If public, insert into public_submissions ───────────────────
      if (isPublic) {
        const { error: subErr } = await supabase
          .from('public_submissions')
          .insert({
            outfit_id:    outfit.id,
            submitted_by: user.id,
            submitted_at: new Date().toISOString(),
          });
        if (subErr) console.warn('public_submissions insert failed:', subErr);
      }

      return outfit.id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user]);

  return { saveOutfit, saving, error };
};