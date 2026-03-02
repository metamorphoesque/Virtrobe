// src/hooks/useSaveOutfit.js
// Handles the full save flow:
//   1. Captures the Three.js canvas as a base64 PNG
//   2. POSTs to Express /api/outfits/save with measurements + garment IDs
//   3. Server uploads screenshot to Supabase storage & inserts DB rows

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
  const [error, setError]   = useState(null);

  const saveOutfit = useCallback(
    async ({
      name,              // string
      description,       // string
      tags,              // string[]
      isPublic,          // boolean
      measurements,      // full measurements object — includes shape key values:
                         //   { gender, height, shoulder, bust, waist, hips, ... }
      upperTemplateId,   // uuid | null
      lowerTemplateId,   // uuid | null
      canvasEl,          // HTMLCanvasElement — the Three.js canvas
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
          }),
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error || `Server error ${resp.status}`);
        }

        const { outfitId } = await resp.json();
        return outfitId;
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