import supabase from './supabaseClient.js';

const profileService = {
  async getById(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();             // ← was .single() → 406 if no row yet
    if (error) throw error;
    return data;
  },

  async getByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .maybeSingle();             // ← same fix
    if (error) throw error;
    return data;
  },

  async update(userId, updates) {
    if (updates.username) {
      updates.username = updates.username.trim().toLowerCase();
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();                  // ← update() always returns a row, .single() is fine here
    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const avatarUrl = urlData.publicUrl;
    await profileService.update(userId, { avatar_url: avatarUrl });
    return avatarUrl;
  },

  async isUsernameAvailable(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data === null;
  },
};

export default profileService;