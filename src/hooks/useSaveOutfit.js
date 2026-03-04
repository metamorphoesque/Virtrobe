// src/hooks/useSaveOutfit.js
// Handles the full save flow:
//   1. Captures the Three.js canvas as a base64 PNG
//   2. POSTs to Express /api/outfits/save with measurements + garment IDs
//   3. Server uploads screenshot to Supabase storage & inserts DB rows
//   4. Returns full outfit data including signed screenshot URL

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Capture the Three.js <canvas> as a base64 data URL.
// canvasEl should be the HTMLCanvasElement (gl.domElement from useThree()).
// Falls back to querySelector if no element passed.
// ---------------------------------------------------------------------------
export const captureCanvas = (canvasEl) =>
  new Promise((resolve, reject) => {
    if (!canvasEl) canvasEl = document.querySelector('canvas');
    if (!canvasEl) return reject(new Error('No canvas element found'));

    // preserveDrawingBuffer must be true in <Canvas> props (it already is)
    canvasEl.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob returned null'));
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // "data:image/png;base64,..."
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      'image/png',
      0.92
    );
  });

// ---------------------------------------------------------------------------
// useSaveOutfit
// ---------------------------------------------------------------------------
export const useSaveOutfit = (user) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveOutfit = useCallback(
    async ({
      name,              // string
      description,       // string
      tags,              // string[]
      isPublic,          // boolean
      measurements,      // full measurements object — includes shape key values:
      //   { gender, height_cm, weight_kg, bmi, bust_cm, waist_cm, hips_cm, shoulder_width_cm }
      upperTemplateId,   // uuid | null
      lowerTemplateId,   // uuid | null
      canvasEl,          // HTMLCanvasElement — the Three.js canvas
      dominantColor,     // string | null
      garmentType,       // string | null
    }) => {
      if (!user) throw new Error('Must be signed in to save an outfit');

      setSaving(true);
      setError(null);

      try {
        // ── 1. Capture screenshot as base64 ─────────────────────────────────
        let screenshotBase64 = null;
        try {
          screenshotBase64 = await captureCanvas(canvasEl);
        } catch (err) {
          // Non-fatal — outfit still saves without a screenshot
          console.warn('Screenshot capture failed (non-fatal):', err);
        }

        // ── 2. Get Supabase JWT for the request ──────────────────────────────
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        // ── 3. POST to Express server ────────────────────────────────────────
        const resp = await fetch('/api/outfits/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name,
            description,
            tags,
            isPublic,
            measurements,                   // shape keys live inside here
            upperTemplateId: upperTemplateId ?? null,
            lowerTemplateId: lowerTemplateId ?? null,
            screenshotBase64,               // null if capture failed
            dominantColor: dominantColor ?? null,
            garmentType: garmentType ?? null,
          }),
        });

        if (!resp.ok) {
          let errMsg = `Server error ${resp.status}`;
          try {
            const body = await resp.json();
            errMsg = body.error || errMsg;
          } catch {
            // Response wasn't JSON — could be HTML error page or payload-too-large
            if (resp.status === 413) errMsg = 'Screenshot too large — try a smaller canvas';
            else if (resp.status === 404) errMsg = 'Save endpoint not found — is the server running?';
          }
          throw new Error(errMsg);
        }

        // Server returns: { outfitId, name, savedAt, isPublic, submissionId, screenshotSignedUrl }
        const result = await resp.json();
        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  return { saveOutfit, saving, error };
};