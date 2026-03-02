// server/routes/outfits.js
const express  = require('express');
const router   = express.Router();
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
//         upperTemplateId, lowerTemplateId, screenshotBase64 }
// ---------------------------------------------------------------------------
router.post('/save', authenticate, async (req, res) => {
  const {
    name,
    description,
    tags,
    isPublic,
    measurements,       // full shape-key snapshot: { gender, height, shoulder, bust, waist, hips, ... }
    upperTemplateId,
    lowerTemplateId,
    screenshotBase64,   // "data:image/png;base64,..." or null
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
        const buffer     = Buffer.from(base64Data, 'base64');
        const filename   = `${req.user.id}/${Date.now()}.png`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('outfit-screenshots')
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

    // ── 2. Destructure shape keys from measurements ────────────────────────
    // Stored both as dedicated columns (easy querying) and as a full JSONB
    // snapshot so no morph target data is ever lost when new keys are added.
    const {
      shoulder,
      bust,
      waist,
      hips,
      height,
      gender,
      ...restMeasurements   // any extra shape keys / future fields
    } = measurements ?? {};

    // ── 3. Insert outfit row ───────────────────────────────────────────────
    const { data: outfit, error: outfitErr } = await supabase
      .from('outfits')
      .insert({
        user_id:               req.user.id,
        name:                  name.trim(),
        description:           description?.trim() || null,
        tags:                  tags ?? [],
        is_public:             isPublic ?? false,
        upper_template_id:     upperTemplateId ?? null,
        lower_template_id:     lowerTemplateId ?? null,
        // Dedicated shape-key columns — add these to your outfits table (see migration below)
        shape_shoulder:        shoulder        ?? null,
        shape_bust:            bust            ?? null,
        shape_waist:           waist           ?? null,
        shape_hips:            hips            ?? null,
        body_height_cm:        height          ?? null,
        body_gender:           gender          ?? null,
        // Full snapshot — keeps everything including any extra shape keys
        measurements_snapshot: measurements    ?? null,
        screenshot_path:       screenshotPath,
        saved_at:              new Date().toISOString(),
      })
      .select('id')
      .single();

    if (outfitErr) throw outfitErr;

    // ── 4. If public, insert into public_submissions ───────────────────────
    if (isPublic) {
      const { error: subErr } = await supabase
        .from('public_submissions')
        .insert({
          outfit_id:    outfit.id,
          submitted_by: req.user.id,
          submitted_at: new Date().toISOString(),
        });
      if (subErr) console.warn('public_submissions insert failed (non-fatal):', subErr);
    }

    res.json({ outfitId: outfit.id });

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
      shape_shoulder, shape_bust, shape_waist, shape_hips,
      body_height_cm, body_gender,
      screenshot_path,
      upper_template_id, lower_template_id
    `)
    .eq('user_id', req.user.id)
    .order('saved_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ outfits: data });
});

module.exports = router;