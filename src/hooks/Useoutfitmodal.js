// src/hooks/useOutfitModal.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { STORAGE_BUCKET } from '../lib/supabase'; // ← use the same bucket constant as garmentTemplateService

export const useOutfitModal = (submissionId, currentUserId) => {
  const [submission, setSubmission] = useState(null);
  const [upperTemplate, setUpperTemplate] = useState(null);
  const [lowerTemplate, setLowerTemplate] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolveTemplateUrl = useCallback(async (templateId) => {
    if (!templateId) return null;
    const { data: tmpl, error: tErr } = await supabase
      .from('garment_templates')
      .select('id, name, type, glb_path, dominant_color') 
      .eq('id', templateId)
      .maybeSingle();                              
    if (tErr || !tmpl) return null;

    let modelUrl = tmpl.glb_path;                        
    if (modelUrl && !modelUrl.startsWith('http')) {
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)                           
        .createSignedUrl(modelUrl, 3600);
      modelUrl = signed?.signedUrl ?? null;
    }

    return { ...tmpl, modelUrl };
  }, []);

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('public_submissions')
        .select(`
          id, submitted_at,
          outfit:outfits (
            id, name, description, tags, is_public,
            screenshot_url, dominant_color, garment_type,
            measurements_snapshot, upper_template_id, lower_template_id, saved_at
          ),
          submitter:profiles!submitted_by (
            id, username, display_name, avatar_url, bio
          )
        `)
        .eq('id', submissionId)
        .single();

      if (err) throw err;

      let screenshotSignedUrl = null;
      if (data.outfit?.screenshot_url) {
        const { data: signed } = await supabase.storage
          .from('moodboard-screenshots')
          .createSignedUrl(data.outfit.screenshot_url, 3600);
        screenshotSignedUrl = signed?.signedUrl ?? null;
      }

      setSubmission({ ...data, outfit: { ...data.outfit, screenshotSignedUrl } });

      const [upper, lower] = await Promise.all([
        resolveTemplateUrl(data.outfit?.upper_template_id),
        resolveTemplateUrl(data.outfit?.lower_template_id),
      ]);
      setUpperTemplate(upper);
      setLowerTemplate(lower);
    } catch (err) {
      console.error('useOutfitModal fetch:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [submissionId, resolveTemplateUrl]);

  const fetchComments = useCallback(async () => {
    if (!submissionId) return;
    const { data } = await supabase
      .from('outfit_comments')
      .select(`id, content, created_at, author:profiles!user_id(id, username, display_name, avatar_url)`)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
  }, [submissionId]);

  const fetchLikes = useCallback(async () => {
    if (!submissionId) return;
    const { count } = await supabase
      .from('outfit_likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId);
    setLikeCount(count ?? 0);

    if (currentUserId) {
      const { data: row } = await supabase
        .from('outfit_likes')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('user_id', currentUserId)
        .maybeSingle();
      setLiked(!!row);
    }
  }, [submissionId, currentUserId]);

  useEffect(() => {
    if (!submissionId) return;
    fetchSubmission();
    fetchComments();
    fetchLikes();
  }, [submissionId, fetchSubmission, fetchComments, fetchLikes]);

  useEffect(() => {
    if (!submissionId) return;
    const channel = supabase
      .channel(`comments:${submissionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'outfit_comments',
        filter: `submission_id=eq.${submissionId}`,
      }, async (payload) => {
        const { data: author } = await supabase
          .from('profiles').select('id, username, display_name, avatar_url')
          .eq('id', payload.new.user_id).single();
        const nc = { id: payload.new.id, content: payload.new.content, created_at: payload.new.created_at, author };
        setComments((prev) => prev.some((c) => c.id === nc.id) ? prev : [...prev, nc]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [submissionId]);

  const toggleLike = useCallback(async () => {
    if (!currentUserId) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from('outfit_likes').insert({ submission_id: submissionId, user_id: currentUserId });
      if (error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); }
    } else {
      const { error } = await supabase.from('outfit_likes').delete()
        .eq('submission_id', submissionId).eq('user_id', currentUserId);
      if (error) { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); }
    }
  }, [liked, submissionId, currentUserId]);

  const postComment = useCallback(async (text) => {
    if (!currentUserId || !text?.trim()) return null;
    const optimistic = { id: `opt-${Date.now()}`, content: text.trim(), created_at: new Date().toISOString(), author: null };
    setComments((prev) => [...prev, optimistic]);
    const { data, error } = await supabase
      .from('outfit_comments')
      .insert({ submission_id: submissionId, user_id: currentUserId, content: text.trim() })
      .select(`id, content, created_at, author:profiles!user_id(id, username, display_name, avatar_url)`)
      .single();
    if (error) { setComments((prev) => prev.filter((c) => c.id !== optimistic.id)); return null; }
    setComments((prev) => prev.map((c) => c.id === optimistic.id ? data : c));
    return data;
  }, [submissionId, currentUserId]);

  const deleteComment = useCallback(async (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    const { error } = await supabase.from('outfit_comments').delete().eq('id', commentId);
    if (error) fetchComments();
  }, [fetchComments]);

  return {
    submission, upperTemplate, lowerTemplate,
    comments, liked, likeCount, loading, error,
    toggleLike, postComment, deleteComment, refetch: fetchSubmission,
  };
};