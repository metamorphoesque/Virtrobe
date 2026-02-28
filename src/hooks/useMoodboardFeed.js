// src/hooks/useMoodboardFeed.js
// Fetches public submissions from Supabase, resolves screenshot URLs,
// and groups them by tag for MoodboardPage.
//
// Returns: { groups: [{ tag, submissions }], loading, error }
// where each submission = { id, imageUrl, likeCount, submitter, outfit }

import { useState, useEffect } from 'react';
import { supabase } from '../services/authService';

export const useMoodboardFeed = () => {
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        // ── 1. Load all public submissions with outfit + submitter data ──────
        const { data: rows, error: fetchErr } = await supabase
          .from('public_submissions')
          .select(`
            id,
            created_at,
            outfit:outfit_id (
              id,
              name,
              description,
              tags,
              dominant_color,
              screenshot_url,
              upper_template_id,
              lower_template_id
            ),
            submitter:user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false });

        if (fetchErr) throw fetchErr;
        if (cancelled) return;

        // ── 2. Fetch like counts in one query ─────────────────────────────────
        const submissionIds = (rows ?? []).map(r => r.id);
        let likesMap = {};

        if (submissionIds.length > 0) {
          const { data: likeRows } = await supabase
            .from('outfit_likes')
            .select('submission_id')
            .in('submission_id', submissionIds);

          (likeRows ?? []).forEach(lr => {
            likesMap[lr.submission_id] = (likesMap[lr.submission_id] ?? 0) + 1;
          });
        }

        // ── 3. Resolve signed screenshot URLs in parallel ─────────────────────
        const resolved = await Promise.all(
          (rows ?? []).map(async (row) => {
            let imageUrl = null;
            const screenshotPath = row.outfit?.screenshot_url;

            if (screenshotPath) {
              const { data: signed } = await supabase.storage
                .from('moodboard-screenshots')
                .createSignedUrl(screenshotPath, 3600);
              imageUrl = signed?.signedUrl ?? null;
            }

            return {
              id:        row.id,
              createdAt: row.created_at,
              imageUrl,
              likeCount: likesMap[row.id] ?? 0,
              submitter: row.submitter ?? null,
              outfit:    row.outfit    ?? null,
            };
          })
        );

        if (cancelled) return;

        // ── 4. Group by tag ───────────────────────────────────────────────────
        // Each outfit can have multiple tags; index into every tag it belongs to.
        const tagMap = {};
        resolved.forEach(sub => {
          const tags = sub.outfit?.tags ?? [];
          if (tags.length === 0) {
            // Untagged → put in a catch-all "other" bucket
            if (!tagMap['other']) tagMap['other'] = [];
            tagMap['other'].push(sub);
          } else {
            tags.forEach(tag => {
              const key = tag.toLowerCase().trim();
              if (!tagMap[key]) tagMap[key] = [];
              tagMap[key].push(sub);
            });
          }
        });

        // Sort tags by submission count (most popular first), then alphabetically
        const sortedGroups = Object.entries(tagMap)
          .sort(([ta, a], [tb, b]) => b.length - a.length || ta.localeCompare(tb))
          .map(([tag, submissions]) => ({ tag, submissions }));

        setGroups(sortedGroups);
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load moodboards.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { groups, loading, error };
};