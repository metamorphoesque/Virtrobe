export const moodboardService = {
  async addItem(userId, outfitId) {
    const { data, error } = await supabase
      .from('moodboard_items')
      .upsert(
        { user_id: userId, outfit_id: outfitId },
        { onConflict: 'user_id,outfit_id', ignoreDuplicates: true }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeItem(userId, outfitId) {
    const { error } = await supabase
      .from('moodboard_items')
      .delete()
      .eq('user_id', userId)
      .eq('outfit_id', outfitId);
    if (error) throw error;
  },

  async getItems(userId) {
    const { data, error } = await supabase
      .from('moodboard_items')
      .select(`
        id, added_at,
        outfit:outfits (
          id, name, screenshot_url, garment_type, dominant_color, saved_at, template_id
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    if (error) throw error;
    if (!data.length) return [];

    const paths = data.map((i) => i.outfit?.screenshot_url).filter(Boolean);
    const urlMap = paths.length ? await storageService.getScreenshotUrls(paths) : {};

    return data.map((item) => ({
      ...item,
      outfit: item.outfit
        ? { ...item.outfit, screenshot_signed_url: urlMap[item.outfit.screenshot_url] ?? null }
        : null,
    }));
  },

  async isPinned(userId, outfitId) {
    const { data, error } = await supabase
      .from('moodboard_items')
      .select('id')
      .eq('user_id', userId)
      .eq('outfit_id', outfitId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },
};
