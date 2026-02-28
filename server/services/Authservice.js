// src/services/authService.js
// Imports the shared singleton — does NOT call createClient().
// Re-exports `supabase` so any hook that does:
//   import { supabase } from '../services/authService'
// continues to work without changes.

import { supabase } from './supabaseClient';

export { supabase };

const authService = {
  async signUp({ email, password, username, displayName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName?.trim() || username,
          username:     username.trim().toLowerCase(),
        },
      },
    });
    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('Sign up failed — no user returned.');

    // Belt-and-braces upsert; the DB trigger is the primary path
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id:           user.id,
        username:     username.trim().toLowerCase(),
        display_name: displayName?.trim() || username,
        bio:          '',
        avatar_url:   null,
      }, { onConflict: 'id', ignoreDuplicates: true });

    if (profErr) console.warn('Profile upsert after signup (non-fatal):', profErr.message);
    return user;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  },

  async getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => callback(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};

export default authService;