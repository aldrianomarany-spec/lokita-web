// POST /api/push/send — called by a Supabase Database Webhook on every INSERT
// into public.notifications. Looks up the recipient's push subscriptions and
// delivers a Web Push to each of their devices, so phones ring even when the
// site is fully closed.
//
// Env (Vercel → Project → Settings → Environment Variables):
//   PUSH_WEBHOOK_SECRET        shared secret; the webhook sends it as x-push-secret
//   VITE_VAPID_PUBLIC_KEY      VAPID public key (also used by the front-end build)
//   VAPID_PRIVATE_KEY          VAPID private key (server-only!)
//   VAPID_SUBJECT              mailto:you@example.com (contact for push services)
//   SUPABASE_SERVICE_ROLE_KEY  service role (server-only!)
//   VITE_SUPABASE_URL          already set for the front-end build
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.PUSH_WEBHOOK_SECRET
  if (!secret || req.headers['x-push-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const pub = process.env.VITE_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!pub || !priv || !supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: 'Push is not configured yet' })
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@lokita.app', pub, priv)

  // Supabase webhook payload: { type: 'INSERT', table, record, ... }
  const rec = req.body && req.body.record
  if (!rec || !rec.user_id) return res.status(400).json({ error: 'No record' })

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', rec.user_id)
  if (error) return res.status(500).json({ error: error.message })
  if (!subs || !subs.length) return res.status(200).json({ sent: 0 })

  const payload = JSON.stringify({ title: rec.title || 'LOKITA', body: rec.body || '', url: '/app' })
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)),
  )

  // prune endpoints the push service says are gone (uninstalled/expired)
  const dead = []
  results.forEach((r, i) => {
    const code = r.status === 'rejected' ? r.reason && r.reason.statusCode : 0
    if (code === 404 || code === 410) dead.push(subs[i].endpoint)
  })
  if (dead.length) await supabase.from('push_subscriptions').delete().in('endpoint', dead)

  return res.status(200).json({ sent: results.filter((r) => r.status === 'fulfilled').length, pruned: dead.length })
}
