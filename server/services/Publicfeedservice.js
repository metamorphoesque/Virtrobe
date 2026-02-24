export const publicFeedService = {
  async submit(userId, outfitId) {
    const { data, error } = await supabase
      .from('public_submissions')
      .insert({ outfit_id: outfitId, submitted_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async withdraw(outfitId) {
    const { error } = await supabase
      .from('public_submissions')
      .delete()
      .eq('outfit_id', outfitId);
    if (error) throw error;
  },

  async isPublic(outfitId) {
    const { data, error } = await supabase
      .from('public_submissions')
      .select('id')
      .eq('outfit_id', outfitId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },

  async getFeed(page = 0, limit = 20) {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('public_submissions')
      .select(`
        id, submitted_at,
        outfit:outfits ( id, name, screenshot_url, garment_type, dominant_color, saved_at ),
        submitter:profiles!submitted_by ( id, username, display_name, avatar_url ),
        likes:outfit_likes(count),
        comments:outfit_comments(count)
      `)
      .order('submitted_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    if (!data.length) return [];

    const paths = data.map((i) => i.outfit?.screenshot_url).filter(Boolean);
    const urlMap = paths.length ? await storageService.getScreenshotUrls(paths) : {};

    return data.map((item) => ({
      ...item,
      likeCount: item.likes[0]?.count ?? 0,
      commentCount: item.comments[0]?.count ?? 0,
      outfit: item.outfit
        ? { ...item.outfit, screenshot_signed_url: urlMap[item.outfit.screenshot_url] ?? null }
        : null,
    }));
  },

  async like(userId, submissionId) {
    const { error } = await supabase
      .from('outfit_likes')
      .insert({ user_id: userId, submission_id: submissionId });
    if (error && error.code !== '23505') throw error;
  },

  async unlike(userId, submissionId) {
    const { error } = await supabase
      .from('outfit_likes')
      .delete()
      .eq('user_id', userId)
      .eq('submission_id', submissionId);
    if (error) throw error;
  },

  async hasLiked(userId, submissionId) {
    const { data, error } = await supabase
      .from('outfit_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('submission_id', submissionId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },

  async addComment(userId, submissionId, content) {
    const { data, error } = await supabase
      .from('outfit_comments')
      .insert({ user_id: userId, submission_id: submissionId, content: content.trim() })
      .select(`
        id, content, created_at,
        author:profiles!user_id ( id, username, display_name, avatar_url )
      `)
      .single();
    if (error) throw error;
    return data;
  },

  async getComments(submissionId) {
    const { data, error } = await supabase
      .from('outfit_comments')
      .select(`
        id, content, created_at,
        author:profiles!user_id ( id, username, display_name, avatar_url )
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async deleteComment(commentId) {
    const { error } = await supabase.from('outfit_comments').delete().eq('id', commentId);
    if (error) throw error;
  },

  async saveToCollection(userId, submissionId) {
    const { data, error } = await supabase
      .from('saved_from_public')
      .upsert(
        { user_id: userId, submission_id: submissionId },
        { onConflict: 'user_id,submission_id', ignoreDuplicates: true }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async unsaveFromCollection(userId, submissionId) {
    const { error } = await supabase
      .from('saved_from_public')
      .delete()
      .eq('user_id', userId)
      .eq('submission_id', submissionId);
    if (error) throw error;
  },

  async hasSaved(userId, submissionId) {
    const { data, error } = await supabase
      .from('saved_from_public')
      .select('id')
      .eq('user_id', userId)
      .eq('submission_id', submissionId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },

  async getSavedFromPublic(userId) {
    const { data, error } = await supabase
      .from('saved_from_public')
      .select(`
        id, saved_at,
        submission:public_submissions (
          id,
          outfit:outfits ( id, name, screenshot_url, garment_type, dominant_color ),
          submitter:profiles!submitted_by ( username, display_name, avatar_url )
        )
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};
