import { useEffect } from 'react'
import { useM } from '../context'
import { useLang } from '../../i18n'
import { protectionFee } from '../../theme'
import { attachProtectionProof, MEETUP_SPOTS } from '../../lib/api'
import ManualFeePay from '../ManualFeePay'
import Overlay, { stop } from './Overlay'
import { Check } from '../../components/Icons'

// 🛡️ launch mode: the protection fee is transferred to the ADMIN's
// GoPay/bank and verified by screenshot proof (Midtrans flow kept dormant).
function ProtectionPayBox({ orderId, amount }: { orderId: string; amount: number }) {
  const { t } = useLang()
  return (
    <div style={{ marginBottom: 14 }}>
      <ManualFeePay
        title={'🛡️ ' + t('Activate Buyer Protection — transfer the fee')}
        amount={amount}
        uploaded={false}
        onUpload={(file) => attachProtectionProof(orderId, file)}
      />
    </div>
  )
}

const s2 = (children: React.ReactNode) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

// launch mode: only LOKITA Handover is offered — Security Post and Meet in
// person stay defined here for one-line re-enabling when volume grows
const ENABLED_PICKUPS: Array<'security' | 'leave' | 'meet'> = ['leave']
const PICKUP_OPTS_ALL = [
  { key: 'security' as const, label: 'Security Post', desc: 'Seller drops it off with 📸 photo proof — pick up anytime', ic: s2(<><path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" /><path d="M9 12l2 2 4-4" /></>) },
  { key: 'leave' as const, label: 'LOKITA Handover', desc: 'The LOKITA team keeps it safe until you collect it — FREE', ic: s2(<><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v9" /></>) },
  { key: 'meet' as const, label: 'Meet in person', desc: 'Pick a campus spot below — check the 🔑 code when you meet', ic: s2(<><path d="M12 21c4-4 7-7.4 7-11a7 7 0 1 0-14 0c0 3.6 3 7 7 11z" /><circle cx="12" cy="10" r="2.4" /></>) },
]
// desk items → LOKITA Handover; direct deals → meet the seller (0038)
const pickupOptsFor = (direct: boolean) =>
  PICKUP_OPTS_ALL.filter((o) => (direct ? o.key === 'meet' : ENABLED_PICKUPS.includes(o.key)))

export default function CheckoutModal() {
  const { state, patch, closeCheckout, setPickup, coContinue, confirmQrisPaid, cancelQrisPayment, openOrders, chatAdmin } = useM()
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
  // Giveaways: nothing to pay at all — just arrange the pickup.
  const isFree = !!sel.isGiveaway
  const isDirect = sel.fulfillment === 'direct'
  const pickupOpts = pickupOptsFor(isDirect)
  const total = sel.priceNum
  const fee = protectionFee(sel.priceNum)
  const grand = total + (s.protectOn ? fee : 0)
  const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

  const payLabel = isDirect ? 'Pay at handover' : 'Pay by transfer'
  const pickupLabel = s.pickup === 'meet' ? 'Meet in person' : s.pickup === 'leave' ? 'LOKITA Handover' : 'Security Post'
  const doneMsg = isFree
    ? t('🙋 Ask sent! The giver picks who gets it — you’ll get a notification if it’s you. Say hi in chat to boost your chances.')
    : isDirect
      ? t('Order sent! Chat the seller to arrange the handover — transfer to them (upload the receipt in My Orders) or pay cash when you meet.')
      : t('Now transfer to the seller and upload your receipt in My Orders. Once the seller confirms the money arrived, chat the LOKITA team to collect your item.')

  return (
    <Overlay onClose={closeCheckout} z={90}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: 0, padding: '28px 30px', width: '100%', maxWidth: 460, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        {s.coStep === 'options' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 21, fontWeight: 800, margin: 0 }}>{isFree ? '🙋 ' + t('Ask for this item') : t('Complete purchase')}</h2>
              <button onClick={closeCheckout} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 34, height: 34, borderRadius: 0, fontSize: 15, cursor: 'pointer', color: '#4A4B4E' }}>✕</button>
            </div>
            <div style={{ background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '12px 15px', margin: '14px 0 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{sel.title}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: isFree ? '#1E9E5A' : '#1E1E1E' }}>{isFree ? t('FREE') : rp(sel.priceNum)}</div>
              </div>
              {/* platform-fee row hidden during launch (fees OFF via Control Room switch) */}
              {s.protectOn && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                    <div style={{ fontSize: 12, color: '#2F6B85', fontWeight: 600 }}>🛡️ {t('Buyer Protection')}</div>
                    <div style={{ fontSize: 12.5, color: '#2F6B85', fontWeight: 700 }}>{rp(fee)}</div>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#8B8B86', fontWeight: 500, marginTop: 2 }}>{t('Collected with your payment at pickup.')}</div>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '1px dashed #C9C9C5' }}>
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>{t('Total — no extra charges')}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 17, color: isFree ? '#1E9E5A' : 'var(--accent,#000000)' }}>{isFree ? t('FREE') : rp(grand)}</div>
              </div>
            </div>
            {isFree && (
              <div style={{ background: '#EAF5EE', border: '1px solid #BFE3CC', padding: '11px 14px', marginBottom: 16, fontSize: 12.5, color: '#2C6E49', fontWeight: 600, lineHeight: 1.5 }}>
                💝 {t('A neighbour is giving this away. Nothing to pay — raise your hand, and the giver picks who gets it. Being friendly in chat helps!')}
              </div>
            )}
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 10 }}>{t('HOW TO EXCHANGE')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
              {pickupOpts.map((o) => {
                const on = s.pickup === o.key
                return (
                  <div key={o.key} onClick={() => setPickup(o.key)} className="lok-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: on ? '#E8F2F7' : '#F5F5F3', border: `1.5px solid ${on ? 'var(--accent,#000000)' : '#D8D8D4'}`, borderRadius: 0, padding: '12px 14px' }}>
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

            {/* 📦 the LOKITA Handover desk — where and when */}
            {s.pickup === 'leave' && (
              <div style={{ background: '#EDF5F9', border: '1px solid #BFDCE8', padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#27607A', marginBottom: 3 }}>📍 {t(s.handoverInfo.location)}</div>
                <div style={{ fontSize: 12, color: '#2F6B85', fontWeight: 500, lineHeight: 1.55, marginBottom: 10 }}>{t(s.handoverInfo.hours)}</div>
                <button
                  onClick={chatAdmin}
                  className="lok-btn"
                  style={{ border: '1px solid #519BB8', background: '#FFFFFF', color: '#27607A', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 0, cursor: 'pointer' }}
                >
                  💬 {t('Chat the LOKITA team')}
                </button>
              </div>
            )}

            {/* 📍 preset campus spot — meet in person picks it HERE, not in chat */}
            {s.pickup === 'meet' && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 8 }}>📍 {t('WHERE TO MEET')}</div>
                <select
                  className="lok-field"
                  value={s.meetSpot}
                  onChange={(e) => patch({ meetSpot: e.target.value })}
                  style={{ width: '100%', background: '#F5F5F3', border: '1.5px solid #D8D8D4', borderRadius: 0, padding: '12px 14px', fontSize: 13.5, fontFamily: 'inherit', fontWeight: 600, color: '#000000' }}
                >
                  {MEETUP_SPOTS.map((sp) => <option key={sp} value={sp}>{t(sp)}</option>)}
                </select>
                <div style={{ fontSize: 11, color: '#8B8B86', fontWeight: 500, marginTop: 6, lineHeight: 1.5 }}>
                  {t('Always meet in a public campus spot. Check the item before paying, and match the 🔑 code on the order.')}
                </div>
              </div>
            )}

            {/* one honest payment note per mode */}
            {!isFree && (
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: '#F5F5F3', border: '1px solid #D8D8D4', padding: '12px 14px', marginBottom: 12 }}>
                <span style={{ fontSize: 17, flex: 'none' }}>💵</span>
                <div style={{ fontSize: 12, color: '#4A4B4E', fontWeight: 500, lineHeight: 1.55 }}>
                  {isDirect ? (
                    <><b>{t('Pay when you meet')}</b> — {t('cash, or transfer to the seller (their details appear on your order). Check the item and match the 🔑 code before paying.')}</>
                  ) : (
                    <><b>{t('Pay first, collect at the desk')}</b> — {t('the seller’s payment details appear on your order. Transfer, upload your receipt, and collect the item from the LOKITA team once the seller confirms.')}</>
                  )}
                </div>
              </div>
            )}
            {!isFree && <div
              onClick={() => patch({ protectOn: !s.protectOn })}
              className="lok-btn"
              role="checkbox"
              aria-checked={s.protectOn}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12, background: s.protectOn ? '#EDF5F9' : '#FFFFFF', border: `1px solid ${s.protectOn ? '#519BB8' : '#D8D8D4'}`, borderRadius: 0, padding: '13px 14px', marginBottom: 22 }}
            >
              <span style={{ width: 18, height: 18, borderRadius: 0, border: `2px solid ${s.protectOn ? '#519BB8' : '#C2C2BE'}`, background: s.protectOn ? '#519BB8' : '#FFFFFF', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 1 }}>
                {s.protectOn && <Check size={12} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: s.protectOn ? '#2F6B85' : '#1E1E1E' }}>🛡️ {t('Buyer Protection')} — Rp {fee.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: 11.5, color: '#5F6063', fontWeight: 500, marginTop: 3, lineHeight: 1.5 }}>{t('Optional. Unlocks dispute mediation by the LOKITA team if something goes wrong with this trade.')}</div>
              </div>
            </div>}
            <button onClick={coContinue} className="lok-btn" style={{ width: '100%', border: 'none', background: isFree ? '#1E9E5A' : 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(0,0,0,.7)' }}>
              {isFree ? '🙋 ' + t('Ask for it — FREE') : `${t('Continue')} · ${rp(grand)}`}
            </button>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: '#E8F2F7', border: '1px solid #BFDCE8', borderRadius: 0, padding: '11px 14px', marginBottom: 12, fontSize: 12.5, fontWeight: 600, color: '#2F6B85' }}>
                <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid #A9CBB8', borderTopColor: '#2F6B85', borderRadius: '50%', display: 'inline-block' }} />
                {t('Waiting for your payment — this confirms automatically.')}
              </div>
            )}
            <button onClick={cancelQrisPayment} className="lok-btn" style={{ width: '100%', border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: 12, borderRadius: 0, cursor: 'pointer' }}>{t('Cancel payment')}</button>
          </div>
        )}

        {s.coStep === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#E8F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: 'var(--accent,#000000)' }}>
              <Check size={32} />
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 9 }}>{t('Order placed')}</div>
            <div style={{ fontSize: 13.5, color: '#4A4B4E', lineHeight: 1.6, marginBottom: 12 }}>{doneMsg}</div>
            {s.protectOn && s.lastOrderId && <ProtectionPayBox orderId={s.lastOrderId} amount={fee} />}
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
