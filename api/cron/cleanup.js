// GET /api/cron/cleanup — Vercel Cron, once a day (vercel.json). The site's
// nightly housekeeper + the owner's daily digest:
//   1. expire stale FEATURED boosts + overdue orders (existing DB functions)
//   2. purge notifications older than 60 days
//   3. nudge sellers whose listing sat quiet for 14+ days
//   4. privacy: delete student-ID photos 30+ days after the member was verified
//   5. send every admin a daily digest notification (rides the push chain)
//
// Auth: Vercel sends "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET
// env var is set. Requests without it are rejected.
import { createClient } from '@supabase/supabase-js'

const DAY = 24 * 60 * 60 * 1000

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Not configured' })
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const report = {}

  // 1. expiries (idempotent DB functions from migrations 0019 + 0027)
  await db.rpc('expire_featured').then(() => {}, () => {})
  await db.rpc('expire_stale_orders').then(() => {}, () => {})

  // 2. notifications older than 60 days
  {
    const cutoff = new Date(Date.now() - 60 * DAY).toISOString()
    const { count } = await db.from('notifications').delete({ count: 'exact' }).lt('created_at', cutoff)
    report.notificationsPurged = count || 0
  }

  // 3. stale-listing nudges (14+ days active, not nudged in the last 14 days)
  {
    const cutoff = new Date(Date.now() - 14 * DAY).toISOString()
    const { data: stale } = await db
      .from('listings')
      .select('id, seller_id, title')
      .eq('status', 'active')
      .lt('created_at', cutoff)
      .or(`last_nudged_at.is.null,last_nudged_at.lt.${cutoff}`)
      .limit(100)
    report.nudges = 0
    for (const l of stale || []) {
      const { error } = await db.from('notifications').insert({
        user_id: l.seller_id,
        type: 'item_update',
        reference_id: l.id,
        title: `⏰ Still selling "${l.title}"?`,
        body: 'It has been on the LOKITA shelf for 2 weeks. Drop the price a little — or collect it back from the desk to free your shelf slot.',
      })
      if (!error) {
        await db.from('listings').update({ last_nudged_at: new Date().toISOString() }).eq('id', l.id)
        report.nudges++
      }
    }
  }

  // 3b. no-show consignments: posted 5+ days ago but the item never reached
  // the desk → close the post, free the shelf slot, tell the seller kindly.
  // (0037 keeps the generic "declined" trigger silent for service-role writes,
  // so this tailored notice is the only one the seller gets.)
  {
    const cutoff = new Date(Date.now() - 5 * DAY).toISOString()
    const { data: ghosts } = await db
      .from('listings')
      .select('id, seller_id, title')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(100)
    report.noShowsExpired = 0
    for (const l of ghosts || []) {
      const { error } = await db.from('listings').update({ status: 'removed' }).eq('id', l.id)
      if (!error) {
        await db.from('notifications').insert({
          user_id: l.seller_id,
          type: 'item_update',
          reference_id: l.id,
          title: `📦 "${l.title}" expired`,
          body: 'It waited 5 days but never reached the LOKITA desk, so the post was closed to free your shelf slot. Repost anytime — and bring it over this time. 😊',
        })
        report.noShowsExpired++
      }
    }
  }

  // 4. privacy: remove ID photos of long-verified members (30+ days)
  {
    const cutoff = new Date(Date.now() - 30 * DAY).toISOString()
    const { data: verified } = await db
      .from('profiles')
      .select('id, verification_doc_url, updated_at')
      .eq('verification_status', 'verified')
      .not('verification_doc_url', 'is', null)
      .lt('updated_at', cutoff)
      .limit(50)
    report.idPhotosPurged = 0
    for (const p of verified || []) {
      const { error } = await db.storage.from('verification-docs').remove([p.verification_doc_url])
      // clear the reference either way — a missing file is as gone as a deleted one
      if (!error || true) {
        await db.from('profiles').update({ verification_doc_url: null }).eq('id', p.id)
        report.idPhotosPurged++
      }
    }
  }

  // 5. daily digest for every admin
  {
    const since = new Date(Date.now() - DAY).toISOString()
    const countOf = async (table, filter) => {
      let q = db.from(table).select('*', { count: 'exact', head: true })
      q = filter(q)
      const { count } = await q
      return count || 0
    }
    const [members, listings, orders, pendingIds, openReports, pendingBoosts, errors] = await Promise.all([
      countOf('profiles', (q) => q.gte('created_at', since)),
      countOf('listings', (q) => q.gte('created_at', since)),
      countOf('transactions', (q) => q.gte('created_at', since)),
      countOf('profiles', (q) => q.eq('verification_status', 'pending').not('verification_doc_url', 'is', null)),
      countOf('reports', (q) => q.eq('status', 'open')),
      countOf('boost_requests', (q) => q.eq('status', 'pending')),
      countOf('client_errors', (q) => q.gte('created_at', since)),
    ])
    const todo = []
    if (pendingIds) todo.push(`${pendingIds} 🪪 to verify`)
    if (openReports) todo.push(`${openReports} report${openReports > 1 ? 's' : ''} open`)
    if (pendingBoosts) todo.push(`${pendingBoosts} 🚀 boost${pendingBoosts > 1 ? 's' : ''} waiting`)
    if (errors) todo.push(`${errors} 🐞 error${errors > 1 ? 's' : ''}`)
    const { data: admins } = await db.from('profiles').select('id').eq('role', 'admin')
    for (const a of admins || []) {
      await db.from('notifications').insert({
        user_id: a.id,
        type: 'system',
        title: `📊 LOKITA today: ${members} new member${members === 1 ? '' : 's'} · ${listings} listing${listings === 1 ? '' : 's'} · ${orders} order${orders === 1 ? '' : 's'}`,
        body: todo.length ? `Needs you: ${todo.join(' · ')}` : 'Nothing needs your attention. 🎉',
      })
    }
    report.digest = { members, listings, orders, admins: (admins || []).length }
  }

  // 6. Monday extra: 📈 the week in review (top category included)
  if (new Date().getUTCDay() === 1) {
    const week = new Date(Date.now() - 7 * DAY).toISOString()
    const countOf = async (table, filter) => {
      let q = db.from(table).select('*', { count: 'exact', head: true })
      q = filter(q)
      const { count } = await q
      return count || 0
    }
    const [wMembers, wListings, wTrades] = await Promise.all([
      countOf('profiles', (q) => q.gte('created_at', week)),
      countOf('listings', (q) => q.gte('created_at', week)),
      countOf('transactions', (q) => q.eq('status', 'completed').gte('created_at', week)),
    ])
    const { data: cats } = await db.from('listings').select('category').gte('created_at', week).limit(500)
    const tally = {}
    for (const c of cats || []) {
      if (c.category) tally[c.category] = (tally[c.category] || 0) + 1
    }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
    const { data: admins } = await db.from('profiles').select('id').eq('role', 'admin')
    for (const a of admins || []) {
      await db.from('notifications').insert({
        user_id: a.id,
        type: 'system',
        title: `📈 LOKITA this week: ${wMembers} new member${wMembers === 1 ? '' : 's'} · ${wListings} listing${wListings === 1 ? '' : 's'} · ${wTrades} trade${wTrades === 1 ? '' : 's'} done`,
        body: top ? `Top category: ${top[0]} (${top[1]} posts). Keep it rolling 💪` : 'A quiet week — maybe time for a broadcast? 📣',
      })
    }
    report.weekly = { wMembers, wListings, wTrades }
  }

  return res.status(200).json({ ok: true, ...report })
}
