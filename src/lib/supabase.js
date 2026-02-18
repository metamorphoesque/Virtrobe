// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const STORAGE_BUCKET = 'garments';

// Private bucket — generates a signed URL valid for 1 hour
// Call this every time you need to load a GLB or thumbnail
export const getSignedUrl = async (path, expiresInSeconds = 3600) => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw new Error(`Failed to get signed URL for ${path}: ${error.message}`);
  return data.signedUrl;
};

// Upload a file to private storage, return the storage path (not a URL)
// We store the path in the DB, not the URL, since URLs expire
export const uploadFile = async (path, file, contentType) => {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
  return path; // return path, not URL
};