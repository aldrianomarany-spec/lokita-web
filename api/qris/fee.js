// POST /api/qris/fee  { kind: 'boost' | 'protection', refId }
// Creates a Midtrans QRIS charge for one of LOKITA's OWN fees — the only
// money that flows through the gateway (items are paid buyer→seller directly).
//   boost      → refId = boost_requests.id  (amount from that row)
//   protection → refId = transactions.id    (amount = its protection_fee)
// Amounts always come from the database, never from the client, so a modified
// client can't pay Rp 1 for a boost. The webhook (api/qris/webhook.js)
// applies the effect when Midtrans confirms settlement.
import { createClient } from '@supabase/supabase-js'

const MIDTRANS_BASE = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const serverKey = process.env.MIDTRANS_SERVER_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serverKey || !supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: 'Online payment is not set up yet.' })
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // authenticate the caller from their Supabase access token
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Not signed in' })
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Not signed in' })
    const uid = userData.user.id

    const { kind, refId } = req.body || {}
    if (!['boost', 'protection'].includes(kind) || !refId || typeof refId !== 'string') {
      return res.status(400).json({ error: 'Bad request' })
    }

    let amount = 0
    let label = ''
    let orderId = ''

    if (kind === 'boost') {
      const { data: b, error } = await supabase
        .from('boost_requests')
        .select('id, seller_id, days, amount, status')
        .eq('id', refId)
        .single()
      if (error || !b) return res.status(404).json({ error: 'Boost request not found' })
      if (b.seller_id !== uid) return res.status(403).json({ error: 'Not your boost request' })
      if (b.status !== 'pending') return res.status(400).json({ error: 'This boost was already handled' })
      amount = Math.round(Number(b.amount))
      label = `LOKITA Boost ${b.days} hari`
      orderId = `lokitab-${b.id}`
    } else {
      const { data: t, error } = await supabase
        .from('transactions')
        .select('id, buyer_id, status, protection_enabled, protection_fee, protection_paid')
        .eq('id', refId)
        .single()
      if (error || !t) return res.status(404).json({ error: 'Order not found' })
      if (t.buyer_id !== uid) return res.status(403).json({ error: 'Not your order' })
      if (!t.protection_enabled) return res.status(400).json({ error: 'Protection was not chosen for this order' })
      if (t.protection_paid) return res.status(400).json({ error: 'Protection is already active' })
      if (t.status === 'cancelled') return res.status(400).json({ error: 'This order was cancelled' })
      amount = Math.round(Number(t.protection_fee))
      label = 'LOKITA Buyer Protection'
      orderId = `lokitap-${t.id}`
    }
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

    const chargeRes = await fetch(`${MIDTRANS_BASE}/v2/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: { order_id: orderId, gross_amount: amount },
        item_details: [{ id: kind, price: amount, quantity: 1, name: label.slice(0, 50) }],
        qris: { acquirer: 'gopay' },
      }),
    })
    const charge = await chargeRes.json()
    // 406 = duplicate order_id (retry after closing the modal) — surface a
    // friendly hint instead of a raw gateway error
    if (String(charge.status_code) !== '201') {
      return res.status(502).json({ error: 'Midtrans rejected the charge: ' + (charge.status_message || 'unknown error') })
    }
    const qrUrl = (charge.actions || []).find((a) => a.name === 'generate-qr-code')?.url
    if (!qrUrl) return res.status(502).json({ error: 'Midtrans did not return a QR code' })

    // remember the reference so the webhook can cross-check the notification
    if (kind === 'boost') {
      await supabase.from('boost_requests').update({ midtrans_ref: orderId }).eq('id', refId)
    } else {
      await supabase.from('transactions').update({ protection_ref: orderId }).eq('id', refId)
    }

    return res.status(200).json({ qrUrl, amount })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Payment service error' })
  }
}
