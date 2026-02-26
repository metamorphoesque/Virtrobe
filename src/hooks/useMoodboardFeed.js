// src/hooks/useMoodboardFeed.js
// Fetches publicly posted outfits grouped by tag from Supabase.
// Each tag group = one horizontal collection row.

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 16;

export const useMoodboardFeed = () => {
  const [groups, setGroups]   = useState([]); // [{ tag, submissions: [] }]
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Pull the most recent public submissions with outfit + submitter data
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
            dominant_color,
            garment_type
          ),
          submitter:profiles!submitted_by (
            id,
            username,
            display_name,
            avatar_url
          ),
          like_count:outfit_likes(count)
        `)
        .order('submitted_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (err) throw err;

      // Resolve signed screenshot URLs in parallel (1hr expiry)
      const withUrls = await Promise.all(
        (data ?? []).map(async (sub) => {
          let imageUrl = null;
          if (sub.outfit?.screenshot_url) {
            const { data: signed } = await supabase.storage
              .from('moodboard-screenshots')
              .createSignedUrl(sub.outfit.screenshot_url, 3600);
            imageUrl = signed?.signedUrl ?? null;
          }
          return {
            ...sub,
            imageUrl,
            likeCount: sub.like_count?.[0]?.count ?? 0,
          };
        })
      );

      // Group by each tag (a submission can appear in multiple groups)
      const tagMap = new Map(); // tag → submissions[]

      withUrls.forEach((sub) => {
        const tags = sub.outfit?.tags ?? [];
        const effectiveTags = tags.length > 0 ? tags : ['untagged'];
        effectiveTags.forEach((tag) => {
          if (!tagMap.has(tag)) tagMap.set(tag, []);
          tagMap.get(tag).push(sub);
        });
      });

      // Convert to sorted array — most populated tags first
      const grouped = Array.from(tagMap.entries())
        .map(([tag, submissions]) => ({ tag, submissions }))
        .sort((a, b) => b.submissions.length - a.submissions.length);

      setGroups(grouped);
    } catch (err) {
      console.error('useMoodboardFeed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  return { groups, loading, error, refetch: fetchFeed };
};