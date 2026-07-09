import { createClient } from '@supabase/supabase-js'

// Keys come from environment variables (never hardcode). Copy .env.example to
// .env and fill in your project's values.
//
// NOTE: the anon key is meant to be shipped in the browser — it's public and
// safe to expose. Data is protected by Row Level Security, not by hiding this
// key. The service_role key must NEVER appear in frontend code.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for the Google OAuth redirect callback
  },
})
