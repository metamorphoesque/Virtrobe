import supabase from './supabaseClient.js';

const storageService = {
  async uploadScreenshot(userId, blob) {
    const filename = `${Date.now()}.png`;
    const path = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from('moodboard-screenshots')
      .upload(path, blob, { contentType: 'image/png', upsert: false });
    if (error) throw error;
    return path;
  },

  async getScreenshotUrl(path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('moodboard-screenshots')
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  async getScreenshotUrls(paths, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('moodboard-screenshots')
      .createSignedUrls(paths, expiresIn);
    if (error) throw error;
    return Object.fromEntries(
      data.map(({ path, signedUrl }) => [path, signedUrl])
    );
  },

  async deleteScreenshot(path) {
    const { error } = await supabase.storage
      .from('moodboard-screenshots')
      .remove([path]);
    if (error) throw error;
  },

  canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        reject(new Error('No canvas element — check mannequinRef.'));
        return;
      }
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null.'));
        },
        'image/png',
        1.0
      );
    });
  },
};

export default storageService;