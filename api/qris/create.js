// POST /api/qris/create  { transactionId }
// Creates a real Midtrans QRIS charge for an order the caller (the buyer) just
// placed. Runs server-side on Vercel — the Midtrans SERVER key and the Supabase
// service_role key live in Vercel env vars and are never shipped to the browser.
//
// Env (Vercel → Project → Settings → Environment Variables):
//   MIDTRANS_SERVER_KEY        sandbox or production server key
//   MIDTRANS_IS_PRODUCTION     "true" for live money; anything else = sandbox
//   SUPABASE_SERVICE_ROLE_KEY  service role (server-only!)
//   VITE_SUPABASE_URL          already set for the front-end build
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
    return res.status(503).json({ error: 'Online payment is not set up yet — please choose Cash on Delivery for now.' })
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // ---- authenticate the caller from their Supabase access token ----
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Not signed in' })
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Not signed in' })
    const uid = userData.user.id

    const { transactionId } = req.body || {}
    if (!transactionId || typeof transactionId !== 'string') {
      return res.status(400).json({ error: 'Missing transactionId' })
    }

    // ---- load the order and verify the caller is its buyer ----
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, buyer_id, listing_id, payment_method, payment_status, status')
      .eq('id', transactionId)
      .single()
    if (txErr || !tx) return res.status(404).json({ error: 'Order not found' })
    if (tx.buyer_id !== uid) return res.status(403).json({ error: 'This is not your order' })
    if (tx.payment_method !== 'qris') return res.status(400).json({ error: 'This order is not a QRIS order' })
    if (tx.payment_status === 'paid') return res.status(400).json({ error: 'This order is already paid' })
    if (tx.status === 'cancelled') return res.status(400).json({ error: 'This order was cancelled' })

    const { data: listing, error: lErr } = await supabase
      .from('listings')
      .select('price, title')
      .eq('id', tx.listing_id)
      .single()
    if (lErr || !listing) return res.status(400).json({ error: 'The listing for this order no longer exists' })

    const amount = Math.round(Number(listing.price))
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

    // ---- create the QRIS charge at Midtrans ----
    const orderId = `lokita-${tx.id}` // uuid + prefix = 43 chars, under Midtrans' 50 limit
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
        item_details: [{ id: tx.listing_id, price: amount, quantity: 1, name: String(listing.title).slice(0, 50) }],
        qris: { acquirer: 'gopay' },
      }),
    })
    const charge = await chargeRes.json()
    if (String(charge.status_code) !== '201') {
      return res.status(502).json({ error: 'Midtrans rejected the charge: ' + (charge.status_message || 'unknown error') })
    }
    const qrUrl = (charge.actions || []).find((a) => a.name === 'generate-qr-code')?.url
    if (!qrUrl) return res.status(502).json({ error: 'Midtrans did not return a QR code' })

    // remember the Midtrans order id so the webhook can be cross-checked
    await supabase.from('transactions').update({ qris_reference_id: orderId }).eq('id', tx.id)

    return res.status(200).json({ orderId: tx.id, qrUrl, amount })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Payment service error' })
  }
}
