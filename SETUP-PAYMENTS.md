# LOKITA — Real QRIS payments (Midtrans) setup

The code is already deployed: `/api/qris/create` makes a real Midtrans QRIS
charge and `/api/qris/webhook` marks the order paid when the money arrives.
Until the keys below are configured, QRIS checkout politely refuses and Cash on
Delivery still works.

Money flow (escrow): buyer pays → funds land in **LOKITA's Midtrans account** →
you pay the seller out after pickup is confirmed (manual for now).

## 1. Create a Midtrans SANDBOX account (fake money, no KYC)

1. Go to https://dashboard.sandbox.midtrans.com and sign up.
2. Open **Settings → Access Keys**.
3. Copy the **Server Key** (starts with `SB-Mid-server-...`).
   ⚠️ Treat it like a password. Never paste it in chat or commit it.

## 2. Add environment variables in Vercel

Vercel → your `lokita-web` project → **Settings → Environment Variables** → add:

| Name | Value |
|------|-------|
| `MIDTRANS_SERVER_KEY` | the `SB-Mid-server-...` key |
| `MIDTRANS_IS_PRODUCTION` | `false` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key |

(`VITE_SUPABASE_URL` is already set from the front-end setup.)

⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses all row security. It is only ever read
by the serverless functions — never add a `VITE_` prefix to it.

Then **redeploy**: Vercel → Deployments → ⋯ on the latest → Redeploy
(env changes only apply to new deployments).

## 3. Tell Midtrans where to send payment notifications

Midtrans sandbox dashboard → **Settings → Configuration** →
**Payment Notification URL**:

```
https://<your-site>.vercel.app/api/qris/webhook
```

Save.

## 4. Test with fake money

1. On the live site, buy an item with **QRIS** → a real QR appears.
2. Open the Midtrans QRIS simulator: https://simulator.sandbox.midtrans.com/v2/qris/index
3. Upload/scan the QR (screenshot it) and press pay.
4. Within a few seconds the checkout flips to **Order confirmed** on its own —
   that's the webhook + realtime working end to end.

## 5. Going LIVE later (real money)

- Complete Midtrans KYC (business verification) on https://dashboard.midtrans.com
- Swap `MIDTRANS_SERVER_KEY` for the production key, set
  `MIDTRANS_IS_PRODUCTION=true`, set the production Payment Notification URL.
- ⚠️ Legal note: holding buyers' money and paying sellers out (escrow) can
  count as payment intermediation under Indonesian (BI/OJK) rules. Check this
  before operating at real scale.
- Seller payouts are manual for now (Midtrans dashboard → Payouts, or bank
  transfer). An automated payout flow is a future phase.
