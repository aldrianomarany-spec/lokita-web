// POST /api/qris/webhook — Midtrans payment notification endpoint.
// Configure in the Midtrans dashboard: Settings → Configuration →
// Payment Notification URL = https://<your-site>/api/qris/webhook
//
// Verifies Midtrans' SHA-512 signature (order_id + status_code + gross_amount +
// server key), then flips the order's payment_status. The service_role client
// bypasses RLS; the protect_transaction_update trigger allows it (no auth.uid).
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const serverKey = process.env.MIDTRANS_SERVER_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serverKey || !supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Not configured' })

  try {
    const n = req.body || {}
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = n
    if (!order_id || !signature_key) return res.status(400).json({ error: 'Bad notification' })

    // ---- verify this really came from Midtrans ----
    const expected = crypto
      .createHash('sha512')
      .update(String(order_id) + String(status_code) + String(gross_amount) + serverKey)
      .digest('hex')
    if (expected !== signature_key) return res.status(403).json({ error: 'Invalid signature' })

    const oid = String(order_id)
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const paid =
      (transaction_status === 'settlement' || transaction_status === 'capture') &&
      (!fraud_status || fraud_status === 'accept')
    const failed = ['expire', 'cancel', 'deny', 'failure'].includes(transaction_status)

    // ---- 🚀 boost fee (lokitab-<boost id>): approve + feature automatically ----
    if (oid.startsWith('lokitab-')) {
      if (!paid) return res.status(200).json({ ok: true }) // pending/failed: admin flow still available
      const boostId = oid.slice('lokitab-'.length)
      const { data: b } = await supabase
        .from('boost_requests')
        .select('id, listing_id, seller_id, days, status, midtrans_ref')
        .eq('id', boostId)
        .eq('midtrans_ref', oid)
        .single()
      if (!b) return res.status(200).json({ ok: true, ignored: true })
      if (b.status !== 'pending') return res.status(200).json({ ok: true, already: true })
      const until = new Date(Date.now() + b.days * 86400000).toISOString()
      await supabase.from('listings').update({ is_featured: true, featured_until: until }).eq('id', b.listing_id)
      await supabase.from('boost_requests').update({ status: 'approved' }).eq('id', b.id)
      await supabase.from('notifications').insert({
        user_id: b.seller_id,
        type: 'system',
        reference_id: b.listing_id,
        title: '🚀 Boost active!',
        body: `Payment received — your listing is FEATURED for ${b.days} days.`,
      })
      await supabase.from('admin_audit').insert({ admin_id: null, action: 'boost_paid_qris', target: b.listing_id, detail: `${b.days}d via Midtrans` }).then(() => {}, () => {})
      return res.status(200).json({ ok: true, boost: 'approved' })
    }

    // ---- 🛡️ protection fee (lokitap-<order id>): activate protection ----
    if (oid.startsWith('lokitap-')) {
      if (!paid) return res.status(200).json({ ok: true })
      const txId = oid.slice('lokitap-'.length)
      const { data: t } = await supabase
        .from('transactions')
        .select('id, buyer_id, protection_paid, protection_ref')
        .eq('id', txId)
        .eq('protection_ref', oid)
        .single()
      if (!t) return res.status(200).json({ ok: true, ignored: true })
      if (t.protection_paid) return res.status(200).json({ ok: true, already: true })
      await supabase.from('transactions').update({ protection_paid: true }).eq('id', t.id)
      await supabase.from('notifications').insert({
        user_id: t.buyer_id,
        type: 'order_update',
        reference_id: t.id,
        title: '🛡️ Buyer Protection active',
        body: 'Payment received — this trade is covered by LOKITA dispute mediation.',
      })
      return res.status(200).json({ ok: true, protection: 'active' })
    }

    // ---- item payment (lokita-<transaction id>): original flow ----
    if (!oid.startsWith('lokita-')) return res.status(200).json({ ok: true, ignored: true })
    const transactionId = oid.slice('lokita-'.length)

    if (paid) {
      await supabase
        .from('transactions')
        .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', transactionId)
        .eq('qris_reference_id', order_id)
    } else if (failed) {
      await supabase
        .from('transactions')
        .update({ payment_status: 'failed' })
        .eq('id', transactionId)
        .eq('qris_reference_id', order_id)
        .neq('payment_status', 'paid') // never demote a paid order
    }
    // pending / other statuses: acknowledge and wait for the next notification

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Webhook error' })
  }
}
