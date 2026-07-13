import { useEffect } from 'react'
import { useM } from '../context'
import { useLang } from '../../i18n'
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
  const { state, patch, closeCheckout, setPay, setPickup, coContinue, confirmQrisPaid, cancelQrisPayment, openOrders } = useM()
  const { t } = useLang()
  const s = state
  const sel = s.sel
  const manualQr = !!s.qris?.manual // static/demo modes: buyer confirms manually

  // QRIS: the Midtrans webhook marks the order paid; realtime refreshes orders,
  // and this flips the modal to the confirmation step automatically.
  const paidOrderId = s.qris?.orderId
  const qrisPaid = !!paidOrderId && s.orders.some((o) => o.id === paidOrderId && o.payment_status === 'paid')
  useEffect(() => {
    if (s.coStep === 'qris' && qrisPaid) patch({ coStep: 'done' })
  }, [s.coStep, qrisPaid, patch])

  if (!sel) return null

  // the listed price already contains LOKITA's platform fee (added when the
  // seller published) — buyers pay exactly what's on the tag, nothing extra.
  const total = sel.priceNum
  const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

  const payLabel = s.pay === 'qris' ? 'QRIS' : 'Cash on Delivery'
  const pickupLabel = s.pickup === 'meet' ? 'Meet in person' : s.pickup === 'leave' ? 'Leave with someone' : 'Security Post'
  const doneMsg =
    (s.pay === 'qris' ? t('Payment sent — the seller will verify it and accept your order.') : t('You’ll pay cash on pickup — the seller will confirm your order first.')) +
    ' ' +
    (s.pickup === 'security'
      ? `${t('Collect it at the Security Post of')} ${sel.building || t('the campus')}.`
      : s.pickup === 'leave'
        ? t('The seller will leave it with a trusted dorm-mate for you.')
        : t('Arrange a spot & time with the seller in chat.'))

  return (
    <Overlay onClose={closeCheckout} z={90}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: 0, padding: '28px 30px', width: '100%', maxWidth: 460, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        {s.coStep === 'options' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 21, fontWeight: 800, margin: 0 }}>{t('Complete purchase')}</h2>
              <button onClick={closeCheckout} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 34, height: 34, borderRadius: 0, fontSize: 15, cursor: 'pointer', color: '#4A4B4E' }}>✕</button>
            </div>
            <div style={{ background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '12px 15px', margin: '14px 0 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{sel.title}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1E1E1E' }}>{rp(sel.priceNum)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600 }}>{t('LOKITA platform fee')} <span title={t('Keeps LOKITA running — escrow, Security Post & support')} style={{ cursor: 'help' }}>ⓘ</span></div>
                <div style={{ fontSize: 12.5, color: '#3D7A54', fontWeight: 700 }}>{t('Included ✓')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '1px dashed #C9C9C5' }}>
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>{t('Total — no extra charges')}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 17, color: 'var(--accent,#000000)' }}>{rp(total)}</div>
              </div>
            </div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 10 }}>{t('HOW TO EXCHANGE')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
              {PICKUP_OPTS.map((o) => {
                const on = s.pickup === o.key
                return (
                  <div key={o.key} onClick={() => setPickup(o.key)} className="lok-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: on ? '#F6F0E3' : '#F5F5F3', border: `1.5px solid ${on ? 'var(--accent,#000000)' : '#D8D8D4'}`, borderRadius: 0, padding: '12px 14px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 0, background: '#fff', color: 'var(--accent,#000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{o.ic}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t(o.label)}</div>
                      <div style={{ fontSize: 11.5, color: '#5F6063', fontWeight: 500 }}>{t(o.desc)}</div>
                    </div>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? 'var(--accent,#000000)' : '#C2C2BE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent,#000000)' }} />}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 10 }}>{t('PAYMENT')}</div>
            <div style={{ display: 'flex', gap: 9, marginBottom: 22 }}>
              {PAY_OPTS.map((o) => {
                const on = s.pay === o.key
                return (
                  <div key={o.key} onClick={() => setPay(o.key)} className="lok-btn" style={{ flex: 1, cursor: 'pointer', background: on ? '#F6F0E3' : '#F5F5F3', border: `1.5px solid ${on ? 'var(--accent,#000000)' : '#D8D8D4'}`, borderRadius: 0, padding: '14px 13px', textAlign: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 0, background: '#fff', color: 'var(--accent,#000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{o.ic}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t(o.label)}</div>
                    <div style={{ fontSize: 11, color: '#5F6063', fontWeight: 500, marginTop: 2 }}>{t(o.desc)}</div>
                  </div>
                )
              })}
            </div>
            <button onClick={coContinue} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(0,0,0,.7)' }}>{t('Continue')} · {rp(total)}</button>
          </>
        )}

        {s.coStep === 'qris' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t('Scan to pay')}</div>
            <div style={{ fontSize: 13, color: '#5F6063', marginBottom: 18 }}>{t('Open any QRIS-enabled app (GoPay, OVO, DANA, mobile banking) and scan')}</div>
            <div style={{ width: 220, height: 220, margin: '0 auto 16px', borderRadius: 0, background: '#fff', border: '1px solid #D8D8D4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' }}>
              {s.qrisLoading ? (
                <span className="lok-spin" style={{ width: 28, height: 28, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
              ) : s.qris ? (
                <img src={s.qris.qrUrl} alt={t('QRIS payment code')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 12.5, color: '#B23A1B', fontWeight: 600, padding: '0 10px' }}>{t("Couldn't load the QR code.")}</span>
              )}
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--accent,#000000)' }}>{rp(total)}</div>
            <div style={{ fontSize: 11, color: '#9A9A94', fontWeight: 600, marginTop: 2 }}>{t('platform fee included — no extra charges')}</div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', marginBottom: 18 }}>LOKITA · QRIS{manualQr ? ' · PROTOTYPE' : ''}</div>
            {s.qris && manualQr && (
              <>
                <button onClick={confirmQrisPaid} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', marginBottom: 10 }}>{t("I've completed payment")}</button>
                <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 500, lineHeight: 1.5, marginBottom: 12 }}>{t("The seller checks the money arrived, then accepts your order — you'll get a notification.")}</div>
              </>
            )}
            {s.qris && !manualQr && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: '#F6F0E3', border: '1px solid #E2D3AF', borderRadius: 0, padding: '11px 14px', marginBottom: 12, fontSize: 12.5, fontWeight: 600, color: '#8A6C34' }}>
                <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid #A9CBB8', borderTopColor: '#8A6C34', borderRadius: '50%', display: 'inline-block' }} />
                {t('Waiting for your payment — this confirms automatically.')}
              </div>
            )}
            <button onClick={cancelQrisPayment} className="lok-btn" style={{ width: '100%', border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: 12, borderRadius: 0, cursor: 'pointer' }}>{t('Cancel payment')}</button>
          </div>
        )}

        {s.coStep === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#F6F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: 'var(--accent,#000000)' }}>
              <Check size={32} />
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 9 }}>{t('Order placed')}</div>
            <div style={{ fontSize: 13.5, color: '#4A4B4E', lineHeight: 1.6, marginBottom: 12 }}>{doneMsg}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#1E1E1E', background: '#ECECEA', padding: '5px 10px', borderRadius: 0 }}>{t(payLabel)}</span>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#1E1E1E', background: '#ECECEA', padding: '5px 10px', borderRadius: 0 }}>{t(pickupLabel)}</span>
            </div>
            <button onClick={openOrders} className="lok-btn" style={{ width: '100%', border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', marginBottom: 10 }}>{t('View my orders')}</button>
            <button onClick={closeCheckout} className="lok-btn" style={{ width: '100%', border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 0, cursor: 'pointer' }}>{t('Keep browsing')}</button>
          </div>
        )}
      </div>
    </Overlay>
  )
}
