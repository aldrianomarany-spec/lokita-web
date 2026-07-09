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

    if (!String(order_id).startsWith('lokita-')) return res.status(200).json({ ok: true, ignored: true })
    const transactionId = String(order_id).slice('lokita-'.length)

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const paid =
      (transaction_status === 'settlement' || transaction_status === 'capture') &&
      (!fraud_status || fraud_status === 'accept')
    const failed = ['expire', 'cancel', 'deny', 'failure'].includes(transaction_status)

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
