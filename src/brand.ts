// Brand assets, plugged in via env so no binaries live in the repo:
//   VITE_BRAND_LOGO_URL — the LOKITA blob logo (transparent PNG)
//   VITE_MASCOT_URL     — Kapi the capybara mascot (transparent PNG)
// Upload both to a public Supabase Storage bucket, copy their public URLs into
// Vercel env vars, redeploy. When unset, the UI falls back to the original
// vector marks — nothing breaks.
export const BRAND_LOGO_URL = ((import.meta.env.VITE_BRAND_LOGO_URL as string | undefined) || '').trim()
export const MASCOT_URL = ((import.meta.env.VITE_MASCOT_URL as string | undefined) || '').trim()
