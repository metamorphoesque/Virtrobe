// src/hooks/useProfile.js
// Full CRUD for user profile and their saved outfit designs.
// All writes are RLS-protected — users can only modify their own rows.

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// useProfile(userId)
// Pass the authenticated users UUID.
//---------------------------------------------------------------------------
export const useProfile = (userId) => {
  const [profile, setProfile]   = useState(null);
  const [outfits, setOutfits]   = useState([]);   // all saved outfits with screenshot URLs
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState(null);

  // ── READ: fetch profile ──────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, location, website_url, avatar_url, created_at')
      .eq('id', userId)
      .single();
    if (err) { setError(err.message); return; }
    setProfile(data);
  }, [userId]);

  // ── READ: fetch saved outfits with signed screenshot URLs ───────────────
  const fetchOutfits = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from('outfits')
      .select('id, name, description, tags, is_public, screenshot_url, saved_at, upper_template_id, lower_template_id')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (err) { setError(err.message); return; }

    // Resolve signed screenshot URLs in parallel
    const resolved = await Promise.all(
      (data ?? []).map(async (outfit) => {
        if (!outfit.screenshot_url) return { ...outfit, screenshotSignedUrl: null };
        const { data: signed } = await supabase.storage
          .from('moodboard-screenshots')
          .createSignedUrl(outfit.screenshot_url, 3600);
        return { ...outfit, screenshotSignedUrl: signed?.signedUrl ?? null };
      })
    );
    setOutfits(resolved);
  }, [userId]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([fetchProfile(), fetchOutfits()])
      .finally(() => setLoading(false));
  }, [userId, fetchProfile, fetchOutfits]);

  // ── UPDATE: profile fields ───────────────────────────────────────────────
  const updateProfile = useCallback(async (fields) => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .update({
          display_name: fields.display_name?.trim()   || null,
          username:     fields.username?.trim().toLowerCase() || null,
          bio:          fields.bio?.trim()            || null,
          location:     fields.location?.trim()       || null,
          website_url:  fields.website_url?.trim()    || null,
        })
        .eq('id', userId)
        .select()
        .single();
      if (err) throw err;
      setProfile(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── UPDATE: avatar upload ────────────────────────────────────────────────
  const uploadAvatar = useCallback(async (file) => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    setError(null);
    try {
      const ext      = file.name.split('.').pop();
      const path     = `${userId}/avatar.${ext}`;

      // Upload (upsert replaces existing avatar)
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache-bust

      // Save to profile
      const { data, error: profErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select()
        .single();
      if (profErr) throw profErr;
      setProfile(data);
      return avatarUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── DELETE: remove avatar ────────────────────────────────────────────────
  const removeAvatar = useCallback(async () => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    try {
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
      setProfile((p) => p ? { ...p, avatar_url: null } : p);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── DELETE: remove a saved outfit ────────────────────────────────────────
  const deleteOutfit = useCallback(async (outfitId) => {
    // Optimistic remove
    setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
    const { error: err } = await supabase
      .from('outfits')
      .delete()
      .eq('id', outfitId)
      .eq('user_id', userId); // RLS double-check
    if (err) {
      setError(err.message);
      fetchOutfits(); // re-sync on failure
    }
  }, [userId, fetchOutfits]);

  //UPDATE: toggle outfit visibility ────────────────────────────────────
  const toggleOutfitVisibility = useCallback(async (outfitId, isPublic) => {
    setOutfits((prev) => prev.map((o) => o.id === outfitId ? { ...o, is_public: isPublic } : o));
    await supabase.from('outfits').update({ is_public: isPublic }).eq('id', outfitId);
  }, []);

  return {
    profile,
    outfits,
    loading,
    saving,
    error,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deleteOutfit,
    toggleOutfitVisibility,
    refetch: () => { fetchProfile(); fetchOutfits(); },
  };
};