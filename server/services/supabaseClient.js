// server/services/supabaseClient.js
// Server-side Supabase client using Node.js environment variables
// (NOT import.meta.env which is Vite-only)

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Prefer service role key for server operations, fall back to anon
const key = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !key) {
  console.warn('⚠️ Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY).');
  console.warn('   Auth middleware will not work until these are configured in server/.env');
}

const supabase = supabaseUrl && key
  ? createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;

module.exports = { supabase };