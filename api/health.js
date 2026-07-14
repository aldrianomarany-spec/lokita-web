// GET /api/health — uptime probe target (point a free UptimeRobot monitor at
// https://lokita.vercel.app/api/health and get emailed the minute it's down).
// Also pings Supabase so a dead database shows up as "degraded", not "ok".
export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  let db = 'unknown'
  if (supabaseUrl) {
    try {
      const r = await fetch(`${supabaseUrl}/auth/v1/health`, { signal: AbortSignal.timeout(4000) })
      db = r.ok ? 'ok' : 'degraded'
    } catch {
      db = 'unreachable'
    }
  }
  const ok = db === 'ok' || db === 'unknown'
  return res.status(ok ? 200 : 503).json({ ok, db, at: new Date().toISOString() })
}
