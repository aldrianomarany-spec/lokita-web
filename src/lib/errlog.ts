// In-house error monitoring — no third-party SDK, no extra bundle weight.
// Uncaught JS errors and promise rejections are reported to the client_errors
// table (migration 0029); admins read them in the Control Room's 🐞 Error
// inbox. Capped hard so a crash loop can't flood the database (the DB also
// rate-limits to 50/hour per reporter as a backstop).
import { supabase } from './supabase'

const MAX_PER_SESSION = 5
let sent = 0
const seen = new Set<string>()

function report(message: string, source: string | null, stack: string | null): void {
  if (sent >= MAX_PER_SESSION) return
  const key = message.slice(0, 120)
  if (seen.has(key)) return // one report per distinct error per session
  seen.add(key)
  sent++
  supabase.auth
    .getUser()
    .then(({ data }) =>
      supabase.from('client_errors').insert({
        user_id: data.user?.id ?? null,
        message: message.slice(0, 600),
        source: source ? source.slice(0, 300) : null,
        stack: stack ? stack.slice(0, 2000) : null,
        ua: navigator.userAgent.slice(0, 300),
      }),
    )
    .then(() => {}, () => {}) // reporting must never throw
}

export function initErrorMonitor(): void {
  window.addEventListener('error', (e) => {
    if (!e.message) return
    report(e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : null, e.error?.stack ?? null)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    const msg = r instanceof Error ? r.message : typeof r === 'string' ? r : 'Unhandled promise rejection'
    report(`Unhandled: ${msg}`, null, r instanceof Error ? r.stack ?? null : null)
  })
}
