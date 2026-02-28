// src/services/authServices.js
// LEGACY — redirects to the shared Supabase client.
// Prefer importing from '../services/authService' (singular) instead.

import { supabase } from '../lib/supabase';

const authService = {
  async signUp({ email, password, username, displayName }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('Sign up failed — no user returned.');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.trim().toLowerCase(),
      display_name: displayName?.trim() || username,
      bio: '',
      avatar_url: null,
    });
    if (profileError) throw profileError;

    return user;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
    return data.user;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      callback(session?.user ?? null)
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