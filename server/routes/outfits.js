// server/routes/outfits.js
const express = require('express');
const router  = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../services/supabaseClient'); // keep for auth.getUser()

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Helper — creates a Supabase client that acts AS the authenticated user.
// RLS policies (auth.uid() = user_id) will pass correctly.
// ---------------------------------------------------------------------------
const userClient = (token) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { persistSession: false },
  });

// ---------------------------------------------------------------------------
// Auth middleware — verifies the Supabase JWT from the Authorization header
// ---------------------------------------------------------------------------
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user  = user;
  req.token = token; // ← store token so routes can build a user-scoped client
  next();
};

// ---------------------------------------------------------------------------
// POST /api/outfits/save
// ---------------------------------------------------------------------------
router.post('/save', authenticate, async (req, res) => {
  const {
    name, description, tags, isPublic, measurements,
    upperTemplateId, lowerTemplateId, screenshotBase64,
    dominantColor, garmentType,
  } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  // Use a client that carries the user's JWT → RLS passes
  const db = userClient(req.token);

  try {
    // ── 1. Upload screenshot ───────────────────────────────────────────────
    let screenshotPath = null;
    if (screenshotBase64) {
      try {
        const base64Data = screenshotBase64.split(',')[1];
        const buffer     = Buffer.from(base64Data, 'base64');
        const filename   = `${req.user.id}/${Date.now()}.png`;

        const { data: uploadData, error: uploadErr } = await db.storage
          .from('moodboard-screenshots')
          .upload(filename, buffer, { contentType: 'image/png', upsert: false });

        if (uploadErr) console.warn('Screenshot upload failed (non-fatal):', uploadErr);
        else screenshotPath = uploadData.path;
      } catch (e) {
        console.warn('Screenshot processing failed (non-fatal):', e);
      }
    }

    // ── 2. Insert outfit row ───────────────────────────────────────────────
    const { data: outfit, error: outfitErr } = await db
      .from('outfits')
      .insert({
        user_id:              req.user.id,
        name:                 name.trim(),
        description:          description?.trim() || null,
        tags:                 tags ?? [],
        is_public:            isPublic ?? false,
        upper_template_id:    upperTemplateId ?? null,
        lower_template_id:    lowerTemplateId ?? null,
        garment_type:         garmentType ?? null,
        dominant_color:       dominantColor ?? null,
        measurements_snapshot: measurements ?? null,
        screenshot_url:       screenshotPath,
        saved_at:             new Date().toISOString(),
      })
      .select('id, name, saved_at, is_public, screenshot_url')
      .single();

    if (outfitErr) throw outfitErr;

    // ── 3. Insert into public_submissions if public ────────────────────────
    let submissionId = null;
    if (isPublic) {
      const { data: sub, error: subErr } = await db
        .from('public_submissions')
        .insert({
          outfit_id:    outfit.id,
          submitted_by: req.user.id,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (subErr) console.warn('public_submissions insert failed (non-fatal):', subErr);
      else submissionId = sub.id;
    }

    // ── 4. Signed screenshot URL ───────────────────────────────────────────
    let screenshotSignedUrl = null;
    if (screenshotPath) {
      const { data: signed } = await db.storage
        .from('moodboard-screenshots')
        .createSignedUrl(screenshotPath, 3600);
      screenshotSignedUrl = signed?.signedUrl ?? null;
    }

    res.json({ outfitId: outfit.id, name: outfit.name, savedAt: outfit.saved_at,
               isPublic: outfit.is_public, submissionId, screenshotSignedUrl });

  } catch (err) {
    console.error('Save outfit error:', err);
    res.status(500).json({ error: err.message || 'Failed to save outfit' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/outfits/mine
// ---------------------------------------------------------------------------
router.get('/mine', authenticate, async (req, res) => {
  const db = userClient(req.token);
  const { data, error } = await db
    .from('outfits')
    .select(`id, name, description, tags, is_public, saved_at,
             screenshot_url, garment_type, dominant_color,
             measurements_snapshot, upper_template_id, lower_template_id`)
    .eq('user_id', req.user.id)
    .order('saved_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ outfits: data });
});

// ---------------------------------------------------------------------------
// GET /api/outfits/:id
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  const db = userClient(req.token);
  try {
    const { data, error } = await db
      .from('outfits')
      .select(`id, name, description, tags, is_public, saved_at,
               screenshot_url, garment_type, dominant_color,
               measurements_snapshot, upper_template_id, lower_template_id`)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Outfit not found' });
      throw error;
    }

    let screenshotSignedUrl = null;
    if (data.screenshot_url) {
      const { data: signed } = await db.storage
        .from('moodboard-screenshots')
        .createSignedUrl(data.screenshot_url, 3600);
      screenshotSignedUrl = signed?.signedUrl ?? null;
    }

    res.json({ outfit: { ...data, screenshotSignedUrl } });
  } catch (err) {
    console.error('Get outfit error:', err);
    res.status(500).json({ error: err.message || 'Failed to get outfit' });
  }
});

module.exports = router;