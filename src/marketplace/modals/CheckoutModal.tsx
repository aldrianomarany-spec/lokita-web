import { useEffect } from 'react'
import { useM } from '../context'
import Overlay, { stop } from './Overlay'
import { Check } from '../../components/Icons'

const s2 = (children: React.ReactNode) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const PICKUP_OPTS = [
  { key: 'meet' as const, label: 'Meet in person', desc: 'Agree a spot & time on campus', ic: s2(<><path d="M12 21c4-4 7-7.4 7-11a7 7 0 1 0-14 0c0 3.6 3 7 7 11z" /><circle cx="12" cy="10" r="2.4" /></>) },
  { key: 'leave' as const, label: 'Leave with someone', desc: 'A trusted dorm-mate hands it over', ic: s2(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.2 2.7-5 6-5" /><circle cx="17" cy="9" r="2.4" /><path d="M14.5 20c0-2.4 1.7-4 3.5-4s3 1.6 3 4" /></>) },
  { key: 'security' as const, label: 'Security Post', desc: 'Drop-off & pickup, no meetup', ic: s2(<><path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" /><path d="M9 12l2 2 4-4" /></>) },
]
const PAY_OPTS = [
  { key: 'cod' as const, label: 'Cash on Delivery', desc: 'Pay in person at pickup', ic: s2(<><path d="M2 7h20v10H2z" /><circle cx="12" cy="12" r="2.3" /><path d="M6 7v10M18 7v10" /></>) },
  { key: 'qris' as const, label: 'QRIS', desc: 'Scan & pay instantly', ic: s2(<><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h3v3h-3zM18 18h2v2h-2z" /></>) },
]

export default function CheckoutModal() {
  const { state, patch, closeCheckout, setPay, setPickup, coContinue, cancelQrisPayment, openOrders } = useM()
  const s = state
  const sel = s.sel

  // QRIS: the Midtrans webhook marks the order paid; realtime refreshes orders,
  // and this flips the modal to the confirmation step automatically.
  const paidOrderId = s.qris?.orderId
  const qrisPaid = !!paidOrderId && s.orders.some((o) => o.id === paidOrderId && o.payment_status === 'paid')
  useEffect(() => {
    if (s.coStep === 'qris' && qrisPaid) patch({ coStep: 'done' })
  }, [s.coStep, qrisPaid, patch])

  if (!sel) return null

  const payLabel = s.pay === 'qris' ? 'QRIS' : 'Cash on Delivery'
  const pickupLabel = s.pickup === 'meet' ? 'Meet in person' : s.pickup === 'leave' ? 'Leave with someone' : 'Security Post'
  const doneMsg =
    (s.pay === 'qris' ? 'Payment confirmed via QRIS. ' : 'You’ll pay cash on pickup. ') +
    (s.pickup === 'security'
      ? `Collect it at the ${sel.building || 'campus'} Security Post.`
      : s.pickup === 'leave'
        ? 'The seller will leave it with a trusted dorm-mate for you.'
        : 'Arrange a spot & time with the seller in chat.')

  return (
    <Overlay onClose={closeCheckout} z={90}>
      <div onClick={stop} style={{ background: '#FBF8F1', borderRadius: 26, padding: '28px 30px', width: '100%', maxWidth: 460, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(32,30,24,.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        {s.coStep === 'options' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 21, fontWeight: 800, margin: 0 }}>Complete purchase</h2>
              <button onClick={closeCheckout} className="lok-navi" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', width: 34, height: 34, borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#5A5648' }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 14, padding: '12px 15px', margin: '14px 0 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{sel.title}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--accent,#2A5FA8)' }}>{sel.price}</div>
            </div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 10 }}>HOW TO EXCHANGE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
              {PICKUP_OPTS.map((o) => {
                const on = s.pickup === o.key
                return (
                  <div key={o.key} onClick={() => setPickup(o.key)} className="lok-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: on ? '#EAF1EC' : '#F4EFE5', border: `1.5px solid ${on ? 'var(--accent,#2A5FA8)' : '#E4DDCE'}`, borderRadius: 14, padding: '12px 14px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', color: 'var(--accent,#2A5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{o.ic}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{o.label}</div>
                      <div style={{ fontSize: 11.5, color: '#6F6A5C', fontWeight: 500 }}>{o.desc}</div>
                    </div>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? 'var(--accent,#2A5FA8)' : '#C9BFA8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent,#2A5FA8)' }} />}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 10 }}>PAYMENT</div>
            <div style={{ display: 'flex', gap: 9, marginBottom: 22 }}>
              {PAY_OPTS.map((o) => {
                const on = s.pay === o.key
                return (
                  <div key={o.key} onClick={() => setPay(o.key)} className="lok-btn" style={{ flex: 1, cursor: 'pointer', background: on ? '#EAF1EC' : '#F4EFE5', border: `1.5px solid ${on ? 'var(--accent,#2A5FA8)' : '#E4DDCE'}`, borderRadius: 14, padding: '14px 13px', textAlign: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', color: 'var(--accent,#2A5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{o.ic}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: '#6F6A5C', fontWeight: 500, marginTop: 2 }}>{o.desc}</div>
                  </div>
                )
              })}
            </div>
            <button onClick={coContinue} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 14, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(27,94,67,.7)' }}>Continue · {sel.price}</button>
          </>
        )}

        {s.coStep === 'qris' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Scan to pay</div>
            <div style={{ fontSize: 13, color: '#6F6A5C', marginBottom: 18 }}>Open any QRIS-enabled app (GoPay, OVO, DANA, mobile banking) and scan</div>
            <div style={{ width: 220, height: 220, margin: '0 auto 16px', borderRadius: 18, background: '#fff', border: '1px solid #E4DDCE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' }}>
              {s.qrisLoading ? (
                <span className="lok-spin" style={{ width: 28, height: 28, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
              ) : s.qris ? (
                <img src={s.qris.qrUrl} alt="QRIS payment code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 12.5, color: '#B23A1B', fontWeight: 600, padding: '0 10px' }}>Couldn't load the QR code.</span>
              )}
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--accent,#2A5FA8)' }}>{sel.price}</div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', marginBottom: 18 }}>LOKITA · QRIS</div>
            {s.qris && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: '#EAF1EC', border: '1px solid #CFE2D7', borderRadius: 12, padding: '11px 14px', marginBottom: 12, fontSize: 12.5, fontWeight: 600, color: '#12503A' }}>
                <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid #A9CBB8', borderTopColor: '#12503A', borderRadius: '50%', display: 'inline-block' }} />
                Waiting for your payment — this confirms automatically.
              </div>
            )}
            <button onClick={cancelQrisPayment} className="lok-btn" style={{ width: '100%', border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Cancel payment</button>
          </div>
        )}

        {s.coStep === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#EAF1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: 'var(--accent,#2A5FA8)' }}>
              <Check size={32} />
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 9 }}>Order confirmed</div>
            <div style={{ fontSize: 13.5, color: '#5A5648', lineHeight: 1.6, marginBottom: 12 }}>{doneMsg}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#3A362C', background: '#F1ECE1', padding: '5px 10px', borderRadius: 8 }}>{payLabel}</span>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#3A362C', background: '#F1ECE1', padding: '5px 10px', borderRadius: 8 }}>{pickupLabel}</span>
            </div>
            <button onClick={openOrders} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 14, cursor: 'pointer', marginBottom: 10 }}>View my orders</button>
            <button onClick={closeCheckout} className="lok-btn" style={{ width: '100%', border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Keep browsing</button>
          </div>
        )}
      </div>
    </Overlay>
  )
}
