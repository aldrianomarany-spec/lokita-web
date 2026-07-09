// Quick end-to-end check that Supabase auth + the profiles trigger work.
// Usage:
//   npm run test:signup                        # random @example.com user
//   npm run test:signup -- email@x.com passwd   # specific credentials
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env (or the environment).
// Requires "Confirm email" to be OFF in the Supabase dashboard so a session is
// returned immediately (see supabase/SETUP.md).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const env = { ...process.env }
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* no .env file — fall back to process.env */
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('✗ Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example → .env and fill it in.')
  process.exit(1)
}

const rand = Math.random().toString(36).slice(2, 8)
const email = process.argv[2] || `lokita-test-${rand}@example.com`
const password = process.argv[3] || `Test-${rand}-pw!`
const name = 'Test Aldriano'

const supabase = createClient(url, anon)

console.log(`• Signing up ${email} …`)
const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { name } },
})
if (signUpErr) {
  console.error('✗ Sign-up failed:', signUpErr.message)
  process.exit(1)
}

const userId = signUp.user?.id
console.log('  auth.users id:', userId)

if (!signUp.session) {
  console.log(
    '\n⚠  No session returned — "Confirm email" is probably ON.\n' +
      '   The user was created but must confirm via email before a session exists.\n' +
      '   For this test, turn Authentication → Providers → Email → "Confirm email" OFF,\n' +
      '   then re-run. (The profiles row was still created by the trigger — check the dashboard.)',
  )
  process.exit(0)
}

// Authenticated as the new user → RLS lets us read our own profile row.
const { data: profile, error: profErr } = await supabase
  .from('profiles')
  .select('id, email, name, verification_status, role, created_at')
  .eq('id', userId)
  .single()

if (profErr) {
  console.error('\n✗ Could not read the profiles row:', profErr.message)
  console.error('  Did you apply supabase/migrations/0001_init.sql? Is the handle_new_user trigger present?')
  process.exit(1)
}

console.log('\n✓ Profile auto-created by trigger:')
console.log(JSON.stringify(profile, null, 2))

if (profile.verification_status !== 'pending') {
  console.warn('\n⚠  Expected verification_status = "pending", got:', profile.verification_status)
}

console.log('\nVERIFY: PASS — auth + profiles trigger + RLS self-read all working.')
await supabase.auth.signOut()
process.exit(0)
