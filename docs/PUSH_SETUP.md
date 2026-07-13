# True push notifications — one-time setup

The code is fully wired; push turns on the moment these settings exist.
Until then the app silently falls back to in-tab chime + popup alerts.

## 1. Vercel environment variables

Vercel → your project → Settings → Environment Variables → add:

| Name | Value |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | the public key (Claude gives you the generated pair, or run `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | the private key from the same pair — **never** put this in code |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` |
| `PUSH_WEBHOOK_SECRET` | any long random string you invent |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key — **server-only** |

Then **Redeploy** (Deployments → ⋯ → Redeploy) so the front-end picks up the public key.

## 2. Supabase Database Webhook

Supabase Dashboard → Database → Webhooks → **Create a new hook**:

- Name: `push-on-notification`
- Table: `public.notifications`
- Events: **INSERT** only
- Type: HTTP Request, Method **POST**
- URL: `https://lokita.vercel.app/api/push/send`
- HTTP Headers: add `x-push-secret` = the same `PUSH_WEBHOOK_SECRET` value

## 3. Run migration 0027 (if not yet)

`supabase/migrations/0027_push_and_boosts.sql` — creates `push_subscriptions`
(+ the boost tables).

## 4. Each member opts in once

Notifications page → tap **🔔 Enable popup alerts**. That both grants the
browser permission and registers the device for true push. From then on the
phone/laptop gets pinged even with LOKITA fully closed.

Notes
- iPhones support Web Push only when LOKITA is added to the Home Screen
  (Share → Add to Home Screen) on iOS 16.4+.
- Delivery is per-device; a member can enable it on several devices.
- Dead subscriptions (uninstalled browsers) are pruned automatically.
