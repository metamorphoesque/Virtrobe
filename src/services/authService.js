// src/services/authService.js
// Uses the shared Supabase client from src/lib/supabase.js
// Do NOT call createClient() here — that creates duplicate GoTrueClient instances.
import { supabase } from '../lib/supabase';

// Re-export so existing imports like `import { supabase } from '../services/authService'` keep working
export { supabase };


const authService = {

  // ── Sign up with email/password ──────────────────────────────────────────
  async signUp({ email, password, username, displayName }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store display_name in user metadata so it's accessible without a
        // separate DB fetch immediately after signup
        data: {
          display_name: displayName?.trim() || username,
          username: username.trim().toLowerCase(),
        },
      },
    });
    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('Sign up failed — no user returned.');

    // The trigger (migration_auth_trigger.sql) auto-creates the profile row.
    // We upsert here as a belt-and-braces fallback — ON CONFLICT does nothing
    // if the trigger already ran.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username.trim().toLowerCase(),
        display_name: displayName?.trim() || username,
        bio: '',
        avatar_url: null,
      }, { onConflict: 'id', ignoreDuplicates: true });

    // Profile creation failure is non-fatal — trigger is the reliable path
    if (profileError) console.warn('Profile upsert after signup:', profileError.message);

    return user;
  },

  // ── Sign in with email/password ──────────────────────────────────────────
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  // ── Google OAuth ─────────────────────────────────────────────────────────
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    // Page redirects — control doesn't return here.
    // On return, onAuthStateChange fires with the new session.
  },

  // ── Sign out ─────────────────────────────────────────────────────────────
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // ── Get current auth user (from active session) ──────────────────────────
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  },

  // ── Get full profile row from DB ─────────────────────────────────────────
  // Returns the profiles table row (display_name, bio, location etc).
  // Call this after getCurrentUser() to get the rich profile data.
  async getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      // If profile doesn't exist yet (race condition), return null gracefully
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // ── Session ──────────────────────────────────────────────────────────────
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // ── Auth state change listener ───────────────────────────────────────────
  // Fires on: sign in, sign out, token refresh, OAuth redirect return.
  // callback receives (authUser | null) — the raw Supabase auth.users object.
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => callback(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  },

  // ── Password reset ───────────────────────────────────────────────────────
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