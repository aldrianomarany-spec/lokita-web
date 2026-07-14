# LOKITA — owner's operations guide

The routines that keep the market healthy. Everything here is owner-side —
no code changes needed.

## Weekly backup (5 minutes, every Sunday)

Free-tier Supabase keeps very limited backup history. One bad SQL click with
no backup is unrecoverable — this ritual is your insurance.

1. Supabase → SQL Editor → run each of these, one at a time:
   ```sql
   select * from public.profiles;
   select * from public.listings;
   select * from public.transactions;
   select * from public.reviews;
   ```
2. After each one, press **Export → Download CSV** (top right of the results).
3. Drop the 4 files in a `LOKITA backups/2026-07-20/` folder on your laptop
   (or Google Drive). Done.

Restoring is a "paste the CSV back with Claude's help" job — the point is
that the data exists somewhere outside Supabase.

## Uptime monitor (one-time, 5 minutes)

1. Create a free account at **uptimerobot.com**.
2. Add a monitor: type **HTTP(s)**, URL `https://lokita.vercel.app/api/health`,
   interval 5 minutes.
3. You now get an email the minute LOKITA (or its database) goes down.

## Nightly cron (one-time setup)

`vercel.json` schedules `/api/cron/cleanup` daily at 02:00 WIB. It:
expires stale boosts + overdue orders, purges 60-day-old notifications,
nudges sellers with 14-day-quiet listings, **deletes student-ID photos 30
days after verification** (privacy), and sends every admin the 📊 daily
digest push.

Setup: Vercel → Project → Settings → Environment Variables → add
`CRON_SECRET` = any long random string → Redeploy. (Vercel automatically
signs its cron calls with it; nobody else can trigger your cleanup.)
`SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_URL` are already set from
the push setup.

Check it ran: Vercel → Project → Logs → filter `/api/cron/cleanup` — one
entry per night with a JSON report.

## Error inbox (🐞 in the Control Room)

Members' browsers report crashes automatically. When something shows up:
copy the top message → paste it to Claude → merged fix usually same day.
"Clear all" once handled.

## Broadcast etiquette (📣 in the Control Room)

Every broadcast buzzes every member's phone. Great for: launch day, boost
promos, moving-out season start. Rule of thumb: **max 1–2 per week** — the
fastest way to lose users is spamming their notifications.

## Season switch (🎓 in the Control Room)

Flip **Moving-out season** ON near semester end (June/July, December) — every
homepage gets the 🎓 strip pushing graduation bundles. Flip it OFF after.
