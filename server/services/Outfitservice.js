export const outfitService = {
  // canvas = mannequinRef.current?.renderer?.domElement
  async save(userId, { canvas, name, garmentType, templateId, dominantColor, measurements }) {
    const blob = await storageService.canvasToBlob(canvas);
    const screenshotPath = await storageService.uploadScreenshot(userId, blob);

    const { data, error } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        name: name || `Try-On ${new Date().toLocaleDateString()}`,
        screenshot_url: screenshotPath,
        garment_type: garmentType,
        template_id: templateId ?? null,
        dominant_color: dominantColor ?? null,
        measurements_snapshot: measurements,
        saved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Roll back screenshot if DB insert fails
      await storageService.deleteScreenshot(screenshotPath).catch(() => {});
      throw error;
    }
    return data;
  },

  async getLog(userId) {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });
    if (error) throw error;
    if (!data.length) return [];

    const paths = data.map((o) => o.screenshot_url).filter(Boolean);
    const urlMap = paths.length ? await storageService.getScreenshotUrls(paths) : {};

    return data.map((outfit) => ({
      ...outfit,
      screenshot_signed_url: urlMap[outfit.screenshot_url] ?? null,
    }));
  },

  async getById(outfitId) {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('id', outfitId)
      .single();
    if (error) throw error;
    const signedUrl = data.screenshot_url
      ? await storageService.getScreenshotUrl(data.screenshot_url)
      : null;
    return { ...data, screenshot_signed_url: signedUrl };
  },

  async delete(outfitId) {
    const { data: outfit, error: fetchError } = await supabase
      .from('outfits')
      .select('screenshot_url')
      .eq('id', outfitId)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase.from('outfits').delete().eq('id', outfitId);
    if (error) throw error;

    if (outfit.screenshot_url) {
      await storageService.deleteScreenshot(outfit.screenshot_url).catch(() => {});
    }
  },

  async rename(outfitId, newName) {
    const { data, error } = await supabase
      .from('outfits')
      .update({ name: newName })
      .eq('id', outfitId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};