import { useState } from 'react'
import { useM } from './context'
import type { OrderRow, OrderStatus } from '../lib/api'
import { Verified } from '../components/Icons'
import { useLang } from '../i18n'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const when = (iso: string | null) => (iso && !isNaN(new Date(iso).getTime()) ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Awaiting seller confirmation', bg: '#FBF2DD', fg: '#9A6A12' },
  paid: { label: 'Accepted · awaiting drop-off', bg: '#EFEFDD', fg: '#7E8154' },
  dropped_off: { label: 'Ready for pickup', bg: '#E7EEF7', fg: '#000000' },
  completed: { label: 'Completed', bg: '#E7F1EA', fg: '#1E9E5A' },
  cancelled: { label: 'Cancelled', bg: '#EFE7D9', fg: '#8B8B86' },
}
const PICKUP_LABEL: Record<string, string> = { meet_in_person: 'Meet in person', trusted_handoff: 'Leave with someone', security_post: 'Security Post' }

function OrderCard({ o }: { o: OrderRow }) {
  const { acceptMyOrder, markOrderDropped, confirmOrderPickup, cancelMyOrder, submitReviewFor } = useM()
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [stars, setStars] = useState(0)
  const [text, setText] = useState('')
  const sm = STATUS_META[o.status]

  const run = (fn: () => Promise<void>) => async () => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      alert((e instanceof Error ? e.message : t('Something went wrong')))
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
      alert(e instanceof Error ? e.message : t('Could not post review'))
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
            : t('Cash · Pay at pickup')}
        </span>
        <span style={chip}>{o.pickup_method ? t(PICKUP_LABEL[o.pickup_method]) : t('Pickup')}</span>
        {o.status === 'paid' && o.dropoff_deadline && <span style={chip}>{t('Drop-off by')} {when(o.dropoff_deadline)}</span>}
        {o.status === 'dropped_off' && o.pickup_deadline && <span style={chip}>{t('Pick up by')} {when(o.pickup_deadline)}</span>}
        {o.status === 'completed' && o.completed_at && <span style={chip}>{t('Completed')} {when(o.completed_at)}</span>}
      </div>

      {/* actions by role + status */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {o.status === 'pending' && o.role === 'seller' && (
          <>
            <button disabled={busy} onClick={run(() => acceptMyOrder(o.id))} className="lok-btn" style={primaryBtn}>{t('Confirm payment & accept ✓')}</button>
            <button disabled={busy} onClick={run(() => cancelMyOrder(o.id))} className="lok-btn" style={ghostBtn}>{t('Decline')}</button>
          </>
        )}
        {o.status === 'pending' && o.role === 'buyer' && (
          <span style={{ fontSize: 12.5, color: '#9A6A12', fontWeight: 700, alignSelf: 'center' }}>{t('⏳ Waiting for the seller to confirm your order…')}</span>
        )}
        {o.status === 'paid' && o.role === 'seller' && (
          <button disabled={busy} onClick={run(() => markOrderDropped(o.id))} className="lok-btn" style={primaryBtn}>{t('Mark as dropped off')}</button>
        )}
        {o.status === 'paid' && o.role === 'buyer' && (
          <span style={{ fontSize: 12.5, color: '#8B8B86', fontWeight: 600, alignSelf: 'center' }}>{t('Waiting for the seller to drop it off…')}</span>
        )}
        {o.status === 'dropped_off' && o.role === 'buyer' && (
          <button disabled={busy} onClick={run(() => confirmOrderPickup(o.id))} className="lok-btn" style={primaryBtn}>{t('Confirm I picked it up')}</button>
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
      </div>

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

export default function OrdersView() {
  const { state } = useM()
  const { t } = useLang()
  const s = state
  const buying = s.orders.filter((o) => o.role === 'buyer')
  const selling = s.orders.filter((o) => o.role === 'seller')

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 6 }}>{t('YOUR TRADES')}</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>{t('My orders')}</h1>
      </div>

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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {buying.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 10 }}>{t('BUYING')} ({buying.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{buying.map((o) => <OrderCard key={o.id} o={o} />)}</div>
            </div>
          )}
          {selling.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 10 }}>{t('SELLING')} ({selling.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{selling.map((o) => <OrderCard key={o.id} o={o} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
