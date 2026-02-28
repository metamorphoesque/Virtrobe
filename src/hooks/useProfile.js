// src/hooks/useProfile.js
// Full CRUD for user profile + saved outfits.
// Reads followers/following counts from the `follows` table.
// All mutations are RLS-protected (only the authenticated user can write their own rows).

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/authService';

export const useProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  // ── READ: profile row (includes follower/following counts) ───────────────
  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    const { data, error: err } = await supabase
      .from('profiles')
      .select(`
        id, username, display_name, bio, location,
        website_url, avatar_url, cover_url, created_at
      `)
      .eq('id', userId)
      .single();

    if (err) {
      // Profile not created yet — trigger may still be running, retry once
      if (err.code === 'PGRST116') {
        await new Promise(r => setTimeout(r, 1200));
        const { data: retry } = await supabase
          .from('profiles').select('*').eq('id', userId).single();
        if (retry) setProfile(await enrichWithCounts(retry));
        return;
      }
      setError(err.message);
      return;
    }

    setProfile(await enrichWithCounts(data));
  }, [userId]);

  // Append follower/following counts from the follows table
  const enrichWithCounts = async (profileRow) => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileRow.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id',  profileRow.id),
    ]);
    return { ...profileRow, followers: followers ?? 0, following: following ?? 0 };
  };

  // ── READ: saved outfits with signed screenshot URLs ──────────────────────
  const fetchOutfits = useCallback(async () => {
    if (!userId) return;

    const { data, error: err } = await supabase
      .from('outfits')
      .select(`
        id, name, description, tags, is_public,
        screenshot_url, saved_at,
        upper_template_id, lower_template_id
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (err) { setError(err.message); return; }

    // Resolve signed screenshot URLs + fetch linked submission_id in parallel
    const resolved = await Promise.all(
      (data ?? []).map(async (outfit) => {
        // Signed URL for screenshot
        let screenshotSignedUrl = null;
        if (outfit.screenshot_url) {
          const { data: signed } = await supabase.storage
            .from('moodboard-screenshots')
            .createSignedUrl(outfit.screenshot_url, 3600);
          screenshotSignedUrl = signed?.signedUrl ?? null;
        }

        // Find the public_submissions row (if any) for this outfit
        // so OutfitModal can be opened
        let submission_id = null;
        if (outfit.is_public) {
          const { data: sub } = await supabase
            .from('public_submissions')
            .select('id')
            .eq('outfit_id', outfit.id)
            .maybeSingle();
          submission_id = sub?.id ?? null;
        }

        return { ...outfit, screenshotSignedUrl, submission_id, dominantColor: null };
      })
    );

    setOutfits(resolved);
  }, [userId]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchProfile(), fetchOutfits()])
      .finally(() => setLoading(false));
  }, [userId]);

  // ── UPDATE: profile text fields ───────────────────────────────────────────
  const updateProfile = useCallback(async (fields) => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .update({
          display_name: fields.display_name?.trim() || null,
          username:     fields.username?.trim().toLowerCase() || null,
          bio:          fields.bio?.trim()         || null,
          location:     fields.location?.trim()    || null,
          website_url:  fields.website_url?.trim() || null,
        })
        .eq('id', userId)
        .select()
        .single();
      if (err) throw err;
      const enriched = await enrichWithCounts(data);
      setProfile(enriched);
      return enriched;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── UPDATE: upload avatar ─────────────────────────────────────────────────
  const uploadAvatar = useCallback(async (file) => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    setError(null);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { data, error: profErr } = await supabase
        .from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId).select().single();
      if (profErr) throw profErr;

      const enriched = await enrichWithCounts(data);
      setProfile(enriched);
      return avatarUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── UPDATE: upload cover image ────────────────────────────────────────────
  const uploadCover = useCallback(async (file) => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    setError(null);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${userId}/cover.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')  // reuse avatars bucket; cover images stored in same bucket
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const coverUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { data, error: profErr } = await supabase
        .from('profiles').update({ cover_url: coverUrl }).eq('id', userId).select().single();
      if (profErr) throw profErr;

      const enriched = await enrichWithCounts(data);
      setProfile(enriched);
      return coverUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── DELETE: remove avatar ─────────────────────────────────────────────────
  const removeAvatar = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
      setProfile(p => p ? { ...p, avatar_url: null } : p);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // ── DELETE: remove a saved outfit ─────────────────────────────────────────
  const deleteOutfit = useCallback(async (outfitId) => {
    setOutfits(prev => prev.filter(o => o.id !== outfitId));
    const { error: err } = await supabase
      .from('outfits').delete().eq('id', outfitId).eq('user_id', userId);
    if (err) { setError(err.message); fetchOutfits(); }
  }, [userId, fetchOutfits]);

  // ── UPDATE: toggle outfit public/private ──────────────────────────────────
  const toggleOutfitVisibility = useCallback(async (outfitId, isPublic) => {
    setOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, is_public: isPublic } : o));
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
    uploadCover,
    removeAvatar,
    deleteOutfit,
    toggleOutfitVisibility,
    refetch: () => { fetchProfile(); fetchOutfits(); },
  };
};