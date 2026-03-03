// server/routes/outfits.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabaseClient');

// ---------------------------------------------------------------------------
// Auth middleware — verifies the Supabase JWT from the Authorization header
// ---------------------------------------------------------------------------
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = user;
  next();
};

// ---------------------------------------------------------------------------
// POST /api/outfits/save
// Body: { name, description, tags, isPublic, measurements,
//         upperTemplateId, lowerTemplateId, screenshotBase64,
//         dominantColor, garmentType }
// ---------------------------------------------------------------------------
router.post('/save', authenticate, async (req, res) => {
  const {
    name,
    description,
    tags,
    isPublic,
    measurements,       // full shape-key snapshot: { gender, height_cm, shoulder_width_cm, bust_cm, waist_cm, hips_cm, ... }
    upperTemplateId,
    lowerTemplateId,
    screenshotBase64,   // "data:image/png;base64,..." or null
    dominantColor,
    garmentType,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // ── 1. Upload screenshot to Supabase Storage ───────────────────────────
    let screenshotPath = null;
    if (screenshotBase64) {
      try {
        // Strip the data:image/png;base64, prefix
        const base64Data = screenshotBase64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${req.user.id}/${Date.now()}.png`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('moodboard-screenshots')
          .upload(filename, buffer, { contentType: 'image/png', upsert: false });

        if (uploadErr) {
          console.warn('Screenshot upload failed (non-fatal):', uploadErr);
        } else {
          screenshotPath = uploadData.path;
        }
      } catch (e) {
        console.warn('Screenshot processing failed (non-fatal):', e);
      }
    }

    // ── 2. Insert outfit row ───────────────────────────────────────────────
    // Uses only columns that exist in the outfits table schema.
    // The full measurements object is stored as JSONB in measurements_snapshot.
    const { data: outfit, error: outfitErr } = await supabase
      .from('outfits')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        tags: tags ?? [],
        is_public: isPublic ?? false,
        upper_template_id: upperTemplateId ?? null,
        lower_template_id: lowerTemplateId ?? null,
        garment_type: garmentType ?? null,
        dominant_color: dominantColor ?? null,
        // Full snapshot — keeps everything including any extra shape keys
        measurements_snapshot: measurements ?? null,
        screenshot_url: screenshotPath,
        saved_at: new Date().toISOString(),
      })
      .select('id, name, saved_at, is_public, screenshot_url')
      .single();

    if (outfitErr) throw outfitErr;

    // ── 3. If public, insert into public_submissions ───────────────────────
    let submissionId = null;
    if (isPublic) {
      const { data: sub, error: subErr } = await supabase
        .from('public_submissions')
        .insert({
          outfit_id: outfit.id,
          submitted_by: req.user.id,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (subErr) {
        console.warn('public_submissions insert failed (non-fatal):', subErr);
      } else {
        submissionId = sub.id;
      }
    }

    // ── 4. Generate signed URL for the screenshot if available ─────────────
    let screenshotSignedUrl = null;
    if (screenshotPath) {
      const { data: signed } = await supabase.storage
        .from('moodboard-screenshots')
        .createSignedUrl(screenshotPath, 3600);
      screenshotSignedUrl = signed?.signedUrl ?? null;
    }

    res.json({
      outfitId: outfit.id,
      name: outfit.name,
      savedAt: outfit.saved_at,
      isPublic: outfit.is_public,
      submissionId,
      screenshotSignedUrl,
    });

  } catch (err) {
    console.error('Save outfit error:', err);
    res.status(500).json({ error: err.message || 'Failed to save outfit' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/outfits/mine
// Returns all saved outfits for the authenticated user
// ---------------------------------------------------------------------------
router.get('/mine', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('outfits')
    .select(`
      id, name, description, tags, is_public, saved_at,
      screenshot_url, garment_type, dominant_color,
      measurements_snapshot,
      upper_template_id, lower_template_id
    `)
    .eq('user_id', req.user.id)
    .order('saved_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ outfits: data });
});

module.exports = router;