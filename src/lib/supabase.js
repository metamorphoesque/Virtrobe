// src/lib/supabase.js
// ============================================
// Supabase client — single instance for the app
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(' Missing Supabase env vars. Add to .env:\n  VITE_SUPABASE_URL\n  VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage helpers
export const STORAGE_BUCKET = 'garments';

export const getPublicUrl = (path) => {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
};

export const uploadFile = async (path, file, contentType) => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw error;
  return getPublicUrl(path);
};