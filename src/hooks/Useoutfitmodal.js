// src/hooks/useOutfitModal.js
// Fetches everything needed for the OutfitModal from Supabase.
// Data is only accessible per your RLS policies:
//   - Public submissions: anyone can read
//   - Comments/likes: anyone can read, only auth users can write
//   - Measurements snapshot: stored on the outfit row itself (no separate fetch needed)

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// useOutfitModal
// Pass submissionId (from public_submissions.id) to load everything.
// ---------------------------------------------------------------------------
export const useOutfitModal = (submissionId, currentUserId) => {
  const [submission, setSubmission] = useState(null);  // full outfit + submitter
  const [comments, setComments]     = useState([]);
  const [liked, setLiked]           = useState(false);
  const [likeCount, setLikeCount]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // ── Fetch submission + outfit + submitter profile ────────────────────────
  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('public_submissions')
        .select(`
          id,
          submitted_at,
          outfit:outfits (
            id,
            name,
            description,
            tags,
            screenshot_url,
            garment_type,
            dominant_color,
            measurements_snapshot,
            saved_at,
            template_id
          ),
          submitter:profiles!submitted_by (
            id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('id', submissionId)
        .single();

      if (err) throw err;

      // Resolve signed screenshot URL (private bucket)
      let screenshotSignedUrl = null;
      if (data.outfit?.screenshot_url) {
        const { data: signedData, error: signErr } = await supabase.storage
          .from('moodboard-screenshots')
          .createSignedUrl(data.outfit.screenshot_url, 3600);
        if (!signErr) screenshotSignedUrl = signedData.signedUrl;
      }

      setSubmission({
        ...data,
        outfit: {
          ...data.outfit,
          screenshot_signed_url: screenshotSignedUrl,
        },
      });
    } catch (err) {
      console.error('useOutfitModal: failed to fetch submission', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  // ── Fetch comments ───────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    if (!submissionId) return;

    const { data, error: err } = await supabase
      .from('outfit_comments')
      .select(`
        id,
        content,
        created_at,
        author:profiles!user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (err) {
      console.error('useOutfitModal: failed to fetch comments', err);
      return;
    }
    setComments(data ?? []);
  }, [submissionId]);

  // ── Fetch like count + whether current user liked ────────────────────────
  const fetchLikes = useCallback(async () => {
    if (!submissionId) return;

    // Total count
    const { count, error: countErr } = await supabase
      .from('outfit_likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId);

    if (!countErr) setLikeCount(count ?? 0);

    // Has current user liked?
    if (currentUserId) {
      const { data: likeRow, error: likeErr } = await supabase
        .from('outfit_likes')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (!likeErr) setLiked(!!likeRow);
    }
  }, [submissionId, currentUserId]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!submissionId) return;
    fetchSubmission();
    fetchComments();
    fetchLikes();
  }, [submissionId, fetchSubmission, fetchComments, fetchLikes]);

  // ── Realtime comments subscription ──────────────────────────────────────
  useEffect(() => {
    if (!submissionId) return;

    const channel = supabase
      .channel(`comments:${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'outfit_comments',
          filter: `submission_id=eq.${submissionId}`,
        },
        async (payload) => {
          // Fetch the author profile for the new comment
          const { data: author } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newComment = {
            id: payload.new.id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            author: author ?? null,
          };

          // Avoid duplicates (our own optimistic comment is already in state)
          setComments((prev) => {
            const exists = prev.some((c) => c.id === newComment.id);
            return exists ? prev : [...prev, newComment];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [submissionId]);

  // ── Toggle like ──────────────────────────────────────────────────────────
  const toggleLike = useCallback(async () => {
    if (!currentUserId) return;

    // Optimistic update
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));

    if (next) {
      const { error } = await supabase
        .from('outfit_likes')
        .insert({ submission_id: submissionId, user_id: currentUserId });
      // Revert on error
      if (error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); }
    } else {
      const { error } = await supabase
        .from('outfit_likes')
        .delete()
        .eq('submission_id', submissionId)
        .eq('user_id', currentUserId);
      if (error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); }
    }
  }, [liked, submissionId, currentUserId]);

  // ── Post comment ─────────────────────────────────────────────────────────
  const postComment = useCallback(async (text) => {
    if (!currentUserId || !text?.trim()) return null;

    // Optimistic insert into local state immediately
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      content: text.trim(),
      created_at: new Date().toISOString(),
      author: null, // filled in by realtime subscription
    };
    setComments((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('outfit_comments')
      .insert({
        submission_id: submissionId,
        user_id: currentUserId,
        content: text.trim(),
      })
      .select(`
        id, content, created_at,
        author:profiles!user_id ( id, username, display_name, avatar_url )
      `)
      .single();

    if (error) {
      // Remove optimistic comment on failure
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      console.error('Failed to post comment:', error);
      return null;
    }

    // Replace optimistic with real row
    setComments((prev) =>
      prev.map((c) => (c.id === optimistic.id ? data : c))
    );
    return data;
  }, [submissionId, currentUserId]);

  // ── Delete comment (own only — RLS enforces on DB side too) ─────────────
  const deleteComment = useCallback(async (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const { error } = await supabase
      .from('outfit_comments')
      .delete()
      .eq('id', commentId);
    if (error) {
      console.error('Failed to delete comment:', error);
      fetchComments(); // re-sync on failure
    }
  }, [fetchComments]);

  return {
    submission,       // { id, submitted_at, outfit: {...}, submitter: {...} }
    comments,         // [{ id, content, created_at, author: {...} }]
    liked,
    likeCount,
    loading,
    error,
    toggleLike,
    postComment,
    deleteComment,
    refetch: fetchSubmission,
  };
};