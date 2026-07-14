import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useM } from './context'
import { fetchSellerPayment, uploadDropoffPhoto, attachProtectionProof, attachPaymentProof, type PaymentDetails, type OrderRow, type OrderStatus } from '../lib/api'
import ManualFeePay from './ManualFeePay'
import { Verified } from '../components/Icons'
import { useLang } from '../i18n'
import { errText } from '../lib/err'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const when = (iso: string | null) => (iso && !isNaN(new Date(iso).getTime()) ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pay the seller · awaiting confirmation', bg: '#FBF2DD', fg: '#9A6A12' },
  paid: { label: 'Paid ✓ · arrange pickup with the team', bg: '#EFEFDD', fg: '#7E8154' },
  dropped_off: { label: 'Ready for pickup', bg: '#E7EEF7', fg: '#000000' },
  completed: { label: 'Completed', bg: '#E7F1EA', fg: '#1E9E5A' },
  cancelled: { label: 'Cancelled', bg: '#EFE7D9', fg: '#8B8B86' },
}
const PICKUP_LABEL: Record<string, string> = { meet_in_person: 'Meet in person', trusted_handoff: 'LOKITA Handover', security_post: 'Security Post' }

function OrderCard({ o }: { o: OrderRow }) {
  const { acceptMyOrder, markOrderDropped, confirmOrderPickup, cancelMyOrder, submitReviewFor, chatAdminPickup } = useM()
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const sm = STATUS_META[o.status]

  // handover code is live while the trade is in motion; receipt after
  const codeActive = !!o.pickup_code && (o.status === 'paid' || o.status === 'dropped_off')
  const freeOrder = Number(o.listing_price) === 0

  // buyer with an ACTIVE accepted order sees how to pay the seller (RLS is
  // the real gate — this fetch simply returns nothing for anyone else)
  const [sellerPay, setSellerPay] = useState<PaymentDetails | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  useEffect(() => {
    let live = true
    if (o.role === 'buyer' && (o.status === 'pending' || o.status === 'paid' || o.status === 'dropped_off') && o.payment_method !== 'qris') {
      fetchSellerPayment(o.counterparty_id).then((p) => live && setSellerPay(p))
    } else {
      setSellerPay(null)
    }
    return () => {
      live = false
    }
  }, [o.role, o.status, o.counterparty_id, o.payment_method])
  useEffect(() => {
    if (!receiptOpen || qrUrl) return
    const payload = `LOKITA RECEIPT\nOrder: ${o.id}\nItem: ${o.listing_title}\nPrice: Rp ${Number(o.listing_price).toLocaleString('id-ID')}\nCode: ${o.pickup_code || '-'}\nDate: ${o.completed_at || o.created_at}`
    QRCode.toDataURL(payload, { width: 320, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
      .then(setQrUrl)
      .catch(() => {})
  }, [receiptOpen, qrUrl, o])

  const run = (fn: () => Promise<void>) => async () => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      alert((errText(e, t('Something went wrong'))))
    } finally {
      setBusy(false)
    }
  }

  const postReview = async () => {
    if (!stars) return alert(t('Please choose a star rating.'))
    setBusy(true)
    try {
      await submitReviewFor(o, stars, text)
      setReviewing(false)
    } catch (e) {
      alert(errText(e, t('Could not post review')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 4 }}>
            {o.role === 'buyer' ? t('BUYING') : t('SELLING')}
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{o.listing_title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#5F6063', fontWeight: 600, marginTop: 3 }}>
            {o.role === 'buyer' ? t('from') : t('to')} {o.counterparty_name}
            {o.counterparty_verified && <Verified size={12} />}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--accent,#000000)' }}>{rupiah(o.listing_price)}</div>
          <span style={{ display: 'inline-block', marginTop: 5, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 600, color: sm.fg, background: sm.bg, padding: '3px 8px', borderRadius: 0 }}>{t(sm.label)}</span>
          {o.protection_enabled && (
            <span style={{ display: 'inline-block', marginTop: 5, marginLeft: 6, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 700, background: o.protection_paid ? '#EAF5EE' : '#FBF2DD', color: o.protection_paid ? '#1E9E5A' : '#9A6A12', padding: '3px 7px', border: `1px solid ${o.protection_paid ? '#BFE3CC' : '#ECD8A6'}`, borderRadius: 0 }}>
              🛡️ {o.protection_paid ? t('Protected') : o.protection_proof_url ? t('Protection · under review') : t('Protection · unpaid')}{(o.protection_fee ?? 0) > 0 ? ` · Rp ${(o.protection_fee as number).toLocaleString('id-ID')}` : ''}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <span style={chip}>
          {o.payment_method === 'qris'
            ? o.payment_status === 'paid'
              ? t('QRIS · Paid ✓')
              : o.payment_status === 'failed'
                ? t('QRIS · Payment failed')
                : o.status === 'pending'
                  ? t('QRIS · Sent, to be confirmed')
                  : t('QRIS · Unpaid')
            : Number(o.listing_price) === 0
              ? '💝 ' + t('Free — nothing to pay')
              : o.pickup_method === 'trusted_handoff'
                ? t('Transfer to the seller')
                : t('Cash · Pay at pickup')}
        </span>
        <span style={chip}>{o.pickup_method ? t(PICKUP_LABEL[o.pickup_method]) : t('Pickup')}</span>
        {o.meetup_spot && <span style={chip}>📍 {t(o.meetup_spot)}</span>}
        {o.status === 'paid' && o.dropoff_deadline && <span style={chip}>{t('Drop-off by')} {when(o.dropoff_deadline)}</span>}
        {o.status === 'dropped_off' && o.pickup_deadline && <span style={chip}>{t('Pick up by')} {when(o.pickup_deadline)}</span>}
        {o.status === 'completed' && o.completed_at && <span style={chip}>{t('Completed')} {when(o.completed_at)}</span>}
      </div>

      {/* 🔑 handover code — buyer shows it, seller checks it matches before
          handing the item over. Both sides see the same code. */}
      {codeActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#EDF5F9', border: '1px dashed #519BB8', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: '#27607A' }}>🔑 {o.pickup_code}</span>
          <span style={{ fontSize: 11.5, color: '#2F6B85', fontWeight: 600, lineHeight: 1.45 }}>
            {o.role === 'buyer' ? t('Show this code at handover — the seller checks it matches.') : t("Ask for the buyer's code — hand it over only if it matches this.")}
          </span>
        </div>
      )}

      {/* 🙋 giveaway ask — the giver picks among everyone who raised a hand */}
      {o.role === 'buyer' && o.status === 'pending' && freeOrder && (
        <div style={{ background: '#EAF5EE', border: '1px solid #BFE3CC', padding: '11px 14px', marginBottom: 12, fontSize: 12.5, fontWeight: 700, color: '#2C6E49' }}>
          🤞 {t('Ask sent — the giver picks who gets it. You’ll get a notification if it’s you.')}
        </div>
      )}

      {/* 💸 pay-first: the buyer uploads their transfer receipt; the seller
          can only confirm against it (DB-enforced) */}
      {o.role === 'buyer' && o.status === 'pending' && !freeOrder && (
        <div style={{ background: o.payment_proof_url ? '#EAF5EE' : '#FBF2DD', border: `1px solid ${o.payment_proof_url ? '#BFE3CC' : '#ECD8A6'}`, padding: '11px 14px', marginBottom: 12 }}>
          {o.payment_proof_url ? (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#2C6E49' }}>✓ {t('Receipt sent — waiting for the seller to confirm your payment.')}</div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#9A6A12', marginBottom: 8 }}>
                💸 {o.pickup_method === 'meet_in_person'
                  ? t('Transfer and upload your receipt — or skip it and pay cash when you meet.')
                  : t('Transfer to the seller above, then upload your receipt — the seller confirms against it.')}
              </div>
              <label className="lok-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: '#519BB8', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '10px 16px', borderRadius: 0, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                📤 {busy ? t('Uploading…') : t('Upload transfer receipt')}
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file || busy) return
                    setBusy(true)
                    try {
                      await attachPaymentProof(o.id, file)
                      window.location.hash = '' // no-op; list refreshes via realtime
                      alert(t('Receipt sent — the seller will confirm shortly.'))
                    } catch (err) {
                      alert(errText(err, t('Something went wrong')))
                    } finally {
                      setBusy(false)
                    }
                  }}
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* 🛡️ protection fee not settled yet → the buyer transfers + uploads proof here */}
      {o.role === 'buyer' && o.protection_enabled && !o.protection_paid && !o.protection_proof_url && o.status !== 'cancelled' && (
        <div style={{ marginBottom: 12 }}>
          <ManualFeePay
            title={'🛡️ ' + t('Activate Buyer Protection — transfer the fee')}
            amount={o.protection_fee ?? 0}
            uploaded={false}
            onUpload={(file) => attachProtectionProof(o.id, file)}
          />
        </div>
      )}

      {/* 💳 how to pay the seller — visible ONLY to this buyer while the order
          is active (database-enforced). No details saved → cash at handover. */}
      {sellerPay && (
        <div style={{ background: '#EAF5EE', border: '1px solid #BFE3CC', padding: '11px 14px', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, letterSpacing: '.08em', color: '#2C6E49', marginBottom: 7 }}>
            💳 {o.pickup_method === 'meet_in_person' ? t('PAY THE SELLER DIRECTLY AT HANDOVER') : t('PAY THE SELLER — TRANSFER NOW')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {sellerPay.ewallet_number && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E1E1E', background: '#FFFFFF', border: '1px solid #D8E8DC', padding: '7px 11px' }}>
                {sellerPay.ewallet_provider || 'E-wallet'} · {sellerPay.ewallet_number}
              </span>
            )}
            {sellerPay.bank_account && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E1E1E', background: '#FFFFFF', border: '1px solid #D8E8DC', padding: '7px 11px' }}>
                {sellerPay.bank_name || 'Bank'} · {sellerPay.bank_account}
              </span>
            )}
            {sellerPay.qris_data_url && (
              <button onClick={() => setQrOpen((v) => !v)} className="lok-btn" style={{ border: '1px solid #1E9E5A', background: qrOpen ? '#1E9E5A' : '#FFFFFF', color: qrOpen ? '#FFFFFF' : '#1E9E5A', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '7px 12px', borderRadius: 0, cursor: 'pointer' }}>
                {qrOpen ? t('Hide QR') : t('Scan their QR')}
              </button>
            )}
          </div>
          {qrOpen && sellerPay.qris_data_url && (
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <img src={sellerPay.qris_data_url} alt="Seller QR" style={{ width: 210, maxWidth: '100%', border: '1px solid #D8E8DC', background: '#FFFFFF', padding: 6 }} />
            </div>
          )}
          <div style={{ fontSize: 10.5, color: '#4A5A50', fontWeight: 500, marginTop: 7, lineHeight: 1.5 }}>
            {o.pickup_method === 'meet_in_person'
              ? t('Pay only when the item is in your hands. Money goes straight to the seller — LOKITA never holds it.')
              : t('Transfer now and upload your receipt below — you collect the item from the LOKITA desk once the seller confirms. LOKITA never holds the money.')}
          </div>
        </div>
      )}

      {/* actions by role + status */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {o.status === 'pending' && o.role === 'seller' && (
          <>
            {o.payment_proof_url && (
              <a href={o.payment_proof_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center', textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#2F6B85' }}>
                <img src={o.payment_proof_url} alt="" style={{ width: 34, height: 34, objectFit: 'cover', border: '1px solid #BFDCE8' }} />
                💸 {t("buyer's receipt")}
              </a>
            )}
            <button
              disabled={busy || (!freeOrder && !o.payment_proof_url && o.pickup_method !== 'meet_in_person')}
              title={!freeOrder && !o.payment_proof_url && o.pickup_method !== 'meet_in_person' ? t("Waiting for the buyer's transfer receipt") : undefined}
              onClick={run(() => acceptMyOrder(o.id))}
              className="lok-btn"
              style={{ ...primaryBtn, opacity: !freeOrder && !o.payment_proof_url && o.pickup_method !== 'meet_in_person' ? 0.5 : 1 }}
            >
              {freeOrder
                ? t('Give it to them ✓')
                : o.pickup_method === 'meet_in_person' && !o.payment_proof_url
                  ? t('Accept the order ✓')
                  : t('Money received — confirm ✓')}
            </button>
            <button disabled={busy} onClick={run(() => cancelMyOrder(o.id))} className="lok-btn" style={ghostBtn}>{t('Decline')}</button>
          </>
        )}
        {o.status === 'paid' && o.role === 'seller' && o.pickup_method === 'trusted_handoff' && (
          <span style={{ fontSize: 12.5, color: '#1E9E5A', fontWeight: 700, alignSelf: 'center' }}>✓ {t('All set — the LOKITA team hands it to the buyer.')}</span>
        )}
        {o.status === 'paid' && o.role === 'seller' && o.pickup_method !== 'trusted_handoff' && (
          o.pickup_method === 'meet_in_person' ? (
            <button disabled={busy} onClick={run(() => markOrderDropped(o.id))} className="lok-btn" style={primaryBtn}>{t('We met — item handed over ✓')}</button>
          ) : (
            /* Security Post / LOKITA Handover: a 📸 photo proof is required —
               it closes the "I dropped it off, trust me" loophole */
            <label className="lok-btn" style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              📸 {busy ? t('Uploading…') : t('Take photo & mark dropped off')}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file || busy) return
                  setBusy(true)
                  try {
                    const url = await uploadDropoffPhoto(o.id, file)
                    await markOrderDropped(o.id, url)
                  } catch (err) {
                    alert(errText(err, t('Something went wrong')))
                  } finally {
                    setBusy(false)
                  }
                }}
              />
            </label>
          )
        )}
        {o.status === 'paid' && o.role === 'buyer' && o.pickup_method === 'trusted_handoff' && (
          <>
            <button disabled={busy} onClick={() => chatAdminPickup(o)} className="lok-btn" style={primaryBtn}>💬 {t('Chat the team — arrange pickup')}</button>
            <button disabled={busy} onClick={run(() => confirmOrderPickup(o.id))} className="lok-btn" style={ghostBtn}>{t('Got it — confirm pickup ✓')}</button>
          </>
        )}
        {o.status === 'paid' && o.role === 'buyer' && o.pickup_method !== 'trusted_handoff' && (
          <span style={{ fontSize: 12.5, color: '#8B8B86', fontWeight: 600, alignSelf: 'center' }}>
            {o.pickup_method === 'meet_in_person'
              ? t('Meet up, check the item & 🔑 code — the seller then marks it handed over.')
              : t('Waiting for the seller to drop it off…')}
          </span>
        )}
        {o.status === 'dropped_off' && o.role === 'buyer' && (
          <button disabled={busy} onClick={run(() => confirmOrderPickup(o.id))} className="lok-btn" style={primaryBtn}>{t('Confirm I picked it up')}</button>
        )}
        {o.status === 'dropped_off' && o.dropoff_photo_url && (
          <a href={o.dropoff_photo_url} target="_blank" rel="noreferrer" title={t('Drop-off proof photo')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'center', textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#2F6B85' }}>
            <img src={o.dropoff_photo_url} alt="" style={{ width: 38, height: 38, objectFit: 'cover', border: '1px solid #BFDCE8' }} />
            📸 {t('Drop-off proof')}
          </a>
        )}
        {o.status === 'dropped_off' && o.role === 'seller' && (
          <span style={{ fontSize: 12.5, color: '#8B8B86', fontWeight: 600, alignSelf: 'center' }}>{t('Waiting for the buyer to collect…')}</span>
        )}
        {(o.status === 'paid' || o.status === 'dropped_off' || (o.status === 'pending' && o.role === 'buyer')) && (
          <button disabled={busy} onClick={run(() => cancelMyOrder(o.id))} className="lok-btn" style={ghostBtn}>{t('Cancel')}</button>
        )}
        {o.status === 'completed' && !o.reviewed && !reviewing && (
          <button onClick={() => setReviewing(true)} className="lok-btn" style={primaryBtn}>{t('Leave a review for')} {o.counterparty_name}</button>
        )}
        {o.status === 'completed' && o.reviewed && (
          <span style={{ fontSize: 12.5, color: '#1E9E5A', fontWeight: 700, alignSelf: 'center' }}>{t('★ Review posted')}</span>
        )}
        {o.status === 'completed' && (
          <button onClick={() => setReceiptOpen((v) => !v)} className="lok-btn" style={ghostBtn}>🧾 {receiptOpen ? t('Hide receipt') : t('View receipt')}</button>
        )}
      </div>

      {/* 🧾 digital receipt — screenshot-able proof of the completed trade */}
      {receiptOpen && o.status === 'completed' && (
        <div style={{ marginTop: 14, border: '1px solid #D8D8D4', background: '#FFFFFF', padding: 0 }}>
          <div style={{ background: '#101418', color: '#FFFFFF', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, letterSpacing: 3, fontSize: 14 }}>LOKITA<span style={{ color: '#519BB8' }}>.</span></span>
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, letterSpacing: 1, color: '#9A9A94' }}>{t('OFFICIAL RECEIPT')}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '14px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
              <div><span style={{ color: '#8B8B86', fontWeight: 600 }}>{t('Item')}:</span> <b>{o.listing_title}</b></div>
              <div><span style={{ color: '#8B8B86', fontWeight: 600 }}>{t('Price')}:</span> <b>{rupiah(o.listing_price)}</b>{o.protection_enabled && (o.protection_fee ?? 0) > 0 ? <> + 🛡️ Rp {(o.protection_fee as number).toLocaleString('id-ID')}</> : null}</div>
              <div><span style={{ color: '#8B8B86', fontWeight: 600 }}>{o.role === 'buyer' ? t('Seller') : t('Buyer')}:</span> <b>{o.counterparty_name}</b></div>
              <div><span style={{ color: '#8B8B86', fontWeight: 600 }}>{t('Completed')}:</span> <b>{when(o.completed_at) || '—'}</b></div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#9A9A94', marginTop: 4 }}>#{o.id.slice(0, 8).toUpperCase()}{o.pickup_code ? ` · 🔑 ${o.pickup_code}` : ''}</div>
            </div>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 108, height: 108, flex: 'none', border: '1px solid #ECECEA' }} />}
          </div>
          <div style={{ borderTop: '1px dashed #C9C9C5', padding: '8px 16px', fontSize: 10.5, color: '#8B8B86', fontWeight: 500 }}>
            {t('Screenshot this as proof of your trade. Verifiable in My Orders on both accounts.')}
          </div>
        </div>
      )}

      {/* inline review form */}
      {reviewing && (
        <div style={{ marginTop: 14, borderTop: '1px solid #E6E6E3', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} onClick={() => setStars(n)} style={{ cursor: 'pointer', fontSize: 30, lineHeight: 1, color: n <= stars ? '#E7A81E' : '#C2C2BE' }}>{n <= stars ? '★' : '☆'}</span>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`${t('How was your trade with')} ${o.counterparty_name}?`} className="lok-field" style={{ width: '100%', background: '#F5F5F3', border: '1.5px solid #D8D8D4', borderRadius: 0, padding: '12px 14px', fontSize: 13.5, fontFamily: 'inherit', fontWeight: 500, color: '#000000', minHeight: 70, resize: 'none' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={() => setReviewing(false)} className="lok-btn" style={ghostBtn}>{t('Cancel')}</button>
            <button disabled={busy} onClick={postReview} className="lok-btn" style={{ ...primaryBtn, flex: 1 }}>{t('Post review')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const chip: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#1E1E1E', background: '#ECECEA', padding: '5px 10px', borderRadius: 0 }
const primaryBtn: React.CSSProperties = { border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '10px 16px', borderRadius: 0, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '10px 16px', borderRadius: 0, cursor: 'pointer' }

const SECTIONS: { title: string; statuses: OrderStatus[]; dim?: boolean }[] = [
  { title: 'WAITING FOR SELLER', statuses: ['pending'] },
  { title: 'IN PROCESS', statuses: ['paid'] },
  { title: 'READY FOR PICKUP', statuses: ['dropped_off'] },
  { title: 'COMPLETED', statuses: ['completed'] },
  { title: 'CANCELLED', statuses: ['cancelled'], dim: true },
]

export default function OrdersView() {
  const { state } = useM()
  const { t } = useLang()
  const s = state
  // buying and selling read very differently — the tabs keep them apart
  const [roleTab, setRoleTab] = useState<'all' | 'buyer' | 'seller'>('all')
  const visible = roleTab === 'all' ? s.orders : s.orders.filter((o) => o.role === roleTab)
  const sections = SECTIONS.map((sec) => ({ ...sec, orders: visible.filter((o) => sec.statuses.includes(o.status)) })).filter((sec) => sec.orders.length > 0)
  const countBuy = s.orders.filter((o) => o.role === 'buyer' && o.status !== 'cancelled' && o.status !== 'completed').length
  const countSell = s.orders.filter((o) => o.role === 'seller' && o.status !== 'cancelled' && o.status !== 'completed').length

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>{t('YOUR TRADES')}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>{t('My orders')}</h1>
      </div>

      {s.orders.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {([
            { key: 'all' as const, label: t('All'), n: 0 },
            { key: 'buyer' as const, label: '🛒 ' + t('Buying'), n: countBuy },
            { key: 'seller' as const, label: '🏷️ ' + t('Selling'), n: countSell },
          ]).map((tb) => (
            <button
              key={tb.key}
              onClick={() => setRoleTab(tb.key)}
              className="lok-chip"
              style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 15px', borderRadius: 0, border: `1px solid ${roleTab === tb.key ? '#000000' : '#D8D8D4'}`, background: roleTab === tb.key ? '#000000' : '#FFFFFF', color: roleTab === tb.key ? '#F7F3EA' : '#3A3B3E', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {tb.label}
              {tb.n > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, opacity: 0.75 }}>{tb.n}</span>}
            </button>
          ))}
        </div>
      )}

      {s.ordersLoading ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 26, height: 26, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.ordersError ? (
        <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', borderRadius: 0, padding: 24, color: '#B23A1B', fontWeight: 600, textAlign: 'center' }}>{t("Couldn't load orders:")} {s.ordersError}</div>
      ) : s.orders.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: '48px 28px', textAlign: 'center', color: '#8B8B86' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🧾</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#000000', marginBottom: 6 }}>{t('No orders yet')}</div>
          <div style={{ fontSize: 13.5 }}>{t("When you buy an item or make a sale, it'll show up here with its progress.")}</div>
        </div>
      ) : sections.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: '38px 28px', textAlign: 'center', color: '#8B8B86', fontSize: 13.5 }}>
          {roleTab === 'buyer' ? t('No purchases here yet.') : t('No sales here yet.')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#9A9A94', marginBottom: 10 }}>{t(sec.title)} ({sec.orders.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: sec.dim ? 0.55 : 1 }}>{sec.orders.map((o) => <OrderCard key={o.id} o={o} />)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
