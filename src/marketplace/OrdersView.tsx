import { useState } from 'react'
import { useM } from './context'
import type { OrderRow, OrderStatus } from '../lib/api'
import { Verified } from '../components/Icons'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const when = (iso: string | null) => (iso && !isNaN(new Date(iso).getTime()) ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  paid: { label: 'Awaiting drop-off', bg: '#FBF2DD', fg: '#9A6A12' },
  dropped_off: { label: 'Ready for pickup', bg: '#E7EEF7', fg: '#2A5FA8' },
  completed: { label: 'Completed', bg: '#E7F1EA', fg: '#1B7A4B' },
  cancelled: { label: 'Cancelled', bg: '#EFE7D9', fg: '#8A8578' },
}
const PICKUP_LABEL: Record<string, string> = { meet_in_person: 'Meet in person', trusted_handoff: 'Leave with someone', security_post: 'Security Post' }

function OrderCard({ o }: { o: OrderRow }) {
  const { markOrderDropped, confirmOrderPickup, cancelMyOrder, submitReviewFor } = useM()
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
      alert((e instanceof Error ? e.message : 'Something went wrong'))
    } finally {
      setBusy(false)
    }
  }

  const postReview = async () => {
    if (!stars) return alert('Please choose a star rating.')
    setBusy(true)
    try {
      await submitReviewFor(o, stars, text)
      setReviewing(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not post review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 4 }}>
            {o.role === 'buyer' ? 'BUYING' : 'SELLING'}
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{o.listing_title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6F6A5C', fontWeight: 600, marginTop: 3 }}>
            {o.role === 'buyer' ? 'from' : 'to'} {o.counterparty_name}
            {o.counterparty_verified && <Verified size={12} />}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--accent,#2A5FA8)' }}>{rupiah(o.listing_price)}</div>
          <span style={{ display: 'inline-block', marginTop: 5, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 600, color: sm.fg, background: sm.bg, padding: '3px 8px', borderRadius: 7 }}>{sm.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <span style={chip}>
          {o.payment_method === 'qris'
            ? o.payment_status === 'paid' ? 'QRIS · Paid ✓' : o.payment_status === 'failed' ? 'QRIS · Payment failed' : 'QRIS · Unpaid'
            : 'Cash · Pay at pickup'}
        </span>
        <span style={chip}>{o.pickup_method ? PICKUP_LABEL[o.pickup_method] : 'Pickup'}</span>
        {o.status === 'paid' && o.dropoff_deadline && <span style={chip}>Drop-off by {when(o.dropoff_deadline)}</span>}
        {o.status === 'dropped_off' && o.pickup_deadline && <span style={chip}>Pick up by {when(o.pickup_deadline)}</span>}
        {o.status === 'completed' && o.completed_at && <span style={chip}>Completed {when(o.completed_at)}</span>}
      </div>

      {/* actions by role + status */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {o.status === 'paid' && o.role === 'seller' && (
          <button disabled={busy} onClick={run(() => markOrderDropped(o.id))} className="lok-btn" style={primaryBtn}>Mark as dropped off</button>
        )}
        {o.status === 'paid' && o.role === 'buyer' && (
          <span style={{ fontSize: 12.5, color: '#8A8578', fontWeight: 600, alignSelf: 'center' }}>Waiting for the seller to drop it off…</span>
        )}
        {o.status === 'dropped_off' && o.role === 'buyer' && (
          <button disabled={busy} onClick={run(() => confirmOrderPickup(o.id))} className="lok-btn" style={primaryBtn}>Confirm I picked it up</button>
        )}
        {o.status === 'dropped_off' && o.role === 'seller' && (
          <span style={{ fontSize: 12.5, color: '#8A8578', fontWeight: 600, alignSelf: 'center' }}>Waiting for the buyer to collect…</span>
        )}
        {(o.status === 'paid' || o.status === 'dropped_off') && (
          <button disabled={busy} onClick={run(() => cancelMyOrder(o.id))} className="lok-btn" style={ghostBtn}>Cancel</button>
        )}
        {o.status === 'completed' && !o.reviewed && !reviewing && (
          <button onClick={() => setReviewing(true)} className="lok-btn" style={primaryBtn}>Leave a review for {o.counterparty_name}</button>
        )}
        {o.status === 'completed' && o.reviewed && (
          <span style={{ fontSize: 12.5, color: '#1B7A4B', fontWeight: 700, alignSelf: 'center' }}>★ Review posted</span>
        )}
      </div>

      {/* inline review form */}
      {reviewing && (
        <div style={{ marginTop: 14, borderTop: '1px solid #EEE7D8', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} onClick={() => setStars(n)} style={{ cursor: 'pointer', fontSize: 30, lineHeight: 1, color: n <= stars ? '#E7A81E' : '#C9BFA8' }}>{n <= stars ? '★' : '☆'}</span>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`How was your trade with ${o.counterparty_name}?`} className="lok-field" style={{ width: '100%', background: '#F4EFE5', border: '1.5px solid #E4DDCE', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, fontFamily: 'inherit', fontWeight: 500, color: '#201E18', minHeight: 70, resize: 'none' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={() => setReviewing(false)} className="lok-btn" style={ghostBtn}>Cancel</button>
            <button disabled={busy} onClick={postReview} className="lok-btn" style={{ ...primaryBtn, flex: 1 }}>Post review</button>
          </div>
        </div>
      )}
    </div>
  )
}

const chip: React.CSSProperties = { fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#3A362C', background: '#F1ECE1', padding: '5px 10px', borderRadius: 8 }
const primaryBtn: React.CSSProperties = { border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '10px 16px', borderRadius: 12, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '10px 16px', borderRadius: 12, cursor: 'pointer' }

export default function OrdersView() {
  const { state } = useM()
  const s = state
  const buying = s.orders.filter((o) => o.role === 'buyer')
  const selling = s.orders.filter((o) => o.role === 'seller')

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', letterSpacing: '.08em', marginBottom: 6 }}>YOUR TRADES</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.025em', margin: 0, lineHeight: 1.02 }}>My orders</h1>
      </div>

      {s.ordersLoading ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="lok-spin" style={{ width: 26, height: 26, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : s.ordersError ? (
        <div style={{ background: '#FBEEE9', border: '1px solid #E4C4B8', borderRadius: 18, padding: 24, color: '#B23A1B', fontWeight: 600, textAlign: 'center' }}>Couldn't load orders: {s.ordersError}</div>
      ) : s.orders.length === 0 ? (
        <div style={{ background: '#FBF8F1', border: '1px dashed #D8CFBB', borderRadius: 20, padding: '48px 28px', textAlign: 'center', color: '#8A8578' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🧾</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, color: '#201E18', marginBottom: 6 }}>No orders yet</div>
          <div style={{ fontSize: 13.5 }}>When you buy an item or make a sale, it'll show up here with its progress.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {buying.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 10 }}>BUYING ({buying.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{buying.map((o) => <OrderCard key={o.id} o={o} />)}</div>
            </div>
          )}
          {selling.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 10 }}>SELLING ({selling.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{selling.map((o) => <OrderCard key={o.id} o={o} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
