import { useState } from 'react'
import { useM } from '../context'
import { attachBoostProof } from '../../lib/api'
import ManualFeePay from '../ManualFeePay'
import { T } from '../../theme'
import { tagStyle } from '../tagStyle'
import { useIsPhone } from '../useIsMobile'
import { useLang } from '../../i18n'
import Overlay, { stop } from './Overlay'
import ReportForm from '../ReportForm'
import { ChevronRight, MapPin, MessageBubble, ShieldCheck, Star, Verified } from '../../components/Icons'
import { errText } from '../../lib/err'

export default function DetailModal() {
  const { state, closeDetail, chatSeller, openCheckout, openMember, deleteMyListing, toggleSaveItem, goSignup, sendOffer, boostListing } = useM()
  const [deleting, setDeleting] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerVal, setOfferVal] = useState('')
  const [boostState, setBoostState] = useState<'idle' | 'busy' | 'pay' | 'sent'>('idle')
  const [boostPay, setBoostPay] = useState<{ id: string; amount: number } | null>(null)
  const isPhone = useIsPhone()
  const { t } = useLang()
  const guest = state.guest
  const sel = state.sel
  if (!sel) return null

  // derive the tinted placeholder + tag from tone/flags so the modal matches
  // the card aesthetic.
  const tone = T[sel.tone]
  const ts = tagStyle(sel)
  const proxTag = (sel as { proxTag?: string }).proxTag || ''
  const photos = sel.photoUrls && sel.photoUrls.length ? sel.photoUrls : sel.photoUrl ? [sel.photoUrl] : []
  const mainPhoto = photos[Math.min(photoIdx, photos.length - 1)] || null
  const hasPhoto = !!mainPhoto
  const isOwner = !!sel.mine
  const isSaved = !!state.saved[sel.id]

  // share kit — every listing has a public deep link (/app?item=<id>) that
  // opens for anyone, even without an account (read-only guest mode)
  const shareUrl = `${window.location.origin}/app?item=${sel.id}`
  const shareText = `${sel.title} — ${sel.isGiveaway ? t('FREE') : sel.price} ${t('on LOKITA, the JIU dorm marketplace')}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const doNativeShare = () => navigator.share({ title: sel.title, text: shareText, url: shareUrl }).catch(() => {})
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const onDelete = async () => {
    if (deleting) return
    if (!window.confirm(t('Remove this listing? This cannot be undone.'))) return
    setDeleting(true)
    try {
      await deleteMyListing(sel.id)
      closeDetail()
    } catch (e) {
      setDeleting(false)
      alert(t('Could not remove listing:') + ' ' + (errText(e, t('unknown error'))))
    }
  }

  return (
    <Overlay onClose={closeDetail}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: isPhone ? 20 : 26, overflow: 'hidden', width: '100%', maxWidth: 900, maxHeight: isPhone ? '94vh' : '88vh', display: 'flex', flexDirection: isPhone ? 'column' : 'row', overflowY: isPhone ? 'auto' : 'hidden', animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)' }}>
        {/* image panel — full width on phone, left column on desktop */}
        <div style={{ width: isPhone ? '100%' : '47%', flex: 'none', background: tone.tint, position: 'relative', minHeight: isPhone ? 240 : 480, height: isPhone ? 240 : 'auto', overflow: 'hidden' }}>
          {hasPhoto ? (
            <img src={mainPhoto!} alt={sel.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg,${tone.stripe} 0 14px,transparent 14px 28px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 12, color: tone.label, textAlign: 'center', padding: '0 24px' }}>{sel.photo}</span>
            </div>
          )}
          {ts.tag && <span style={{ position: 'absolute', top: 16, left: 16, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 600, color: ts.tagFg, background: ts.tagBg, padding: '5px 10px', borderRadius: 0, letterSpacing: '.04em' }}>{ts.tag}</span>}
          {!isOwner && !guest && (
            <button
              onClick={() => toggleSaveItem(sel.id)}
              className="lok-heart"
              title={isSaved ? t('Remove from saved') : t('Save item')}
              style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(251,248,241,.92)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#E7A81E' : '#4A4B4E', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}
            >
              <Star fill={isSaved ? '#E7A81E' : 'none'} size={21} />
            </button>
          )}
          {photos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', gap: 7, overflowX: 'auto', padding: 4 }}>
              {photos.map((u, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoIdx(i)
                  }}
                  style={{ flex: 'none', width: 48, height: 48, borderRadius: 0, overflow: 'hidden', padding: 0, cursor: 'pointer', border: i === Math.min(photoIdx, photos.length - 1) ? '2.5px solid #FFFFFF' : '2.5px solid rgba(251,248,241,.45)', boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}
                >
                  <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* right content — parent scrolls on phone, this panel scrolls on desktop */}
        <div style={{ flex: 1, padding: isPhone ? '20px 20px 26px' : '30px 32px', overflowY: isPhone ? 'visible' : 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, color: '#9A9A94', letterSpacing: '.06em', paddingTop: 6 }}>{t(sel.cat)}</span>
            <button onClick={closeDetail} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 36, height: 36, borderRadius: 0, fontSize: 16, cursor: 'pointer', color: '#4A4B4E', flex: 'none' }}>✕</button>
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', margin: '6px 0 8px', lineHeight: 1.12 }}>{sel.title}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: isOwner && (sel.platformFee || 0) > 0 ? 6 : 16 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, color: sel.isGiveaway ? '#1E9E5A' : 'var(--accent,#000000)' }}>{sel.isGiveaway ? '💝 ' + t('FREE') : sel.price}</span>
            {(sel.viewCount ?? 0) > 0 && (
              <span title={t('How many neighbours opened this listing')} style={{ fontSize: 12.5, fontWeight: 700, color: '#2F6B85' }}>👁 {sel.viewCount} {t('views')}</span>
            )}
          </div>
          {/* only the owner sees the fee split — buyers just see the listed price */}
          {isOwner && (sel.platformFee || 0) > 0 && (
            <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600, marginBottom: 14 }}>
              {t('You receive')} <b style={{ color: '#3D7A54' }}>Rp {(sel.priceNum - (sel.platformFee || 0)).toLocaleString('id-ID')}</b> {t('when it sells')} · Rp {(sel.platformFee || 0).toLocaleString('id-ID')} {t('LOKITA fee included')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {!isOwner && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#1E9E5A', background: '#EAF5EE', border: '1px solid #BFE3CC', padding: '8px 12px', borderRadius: 0 }}>✓ {t('In LOKITA custody — ready for pickup')}</span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#1E1E1E', background: '#ECECEA', padding: '8px 12px', borderRadius: 0 }}>{t('Condition')} · {t(sel.cond)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#1E1E1E', background: '#ECECEA', padding: '8px 12px', borderRadius: 0 }}>
              <MapPin size={12} />
              {proxTag}
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: '#4A4B4E', margin: '0 0 18px' }}>{sel.desc}</p>

          {sel.bundleItems && sel.bundleItems.length > 0 && (
            <div style={{ background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#7E8154', letterSpacing: '.06em', marginBottom: 9 }}>{t("WHAT'S IN THIS BUNDLE")} · {sel.bundleItems.length} {t('ITEMS')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sel.bundleItems.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: '#1E1E1E' }}>
                    <span style={{ width: 17, height: 17, borderRadius: 0, background: '#E4E5D3', color: '#7E8154', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flex: 'none' }}>✓</span>
                    {it}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* seller card */}
          <div onClick={() => openMember(sel.ownerId ?? null, sel.seller)} className="lok-btn" style={{ cursor: 'pointer', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: 15, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: tone.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{sel.sellerInitial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 15 }}>
                {sel.seller}
                {sel.sellerRole === 'admin' ? (
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 8.5, fontWeight: 700, background: '#519BB8', color: '#FFFFFF', padding: '2px 6px', letterSpacing: 1, borderRadius: 0 }}>🛡️ {t('ADMIN')}</span>
                ) : (
                  sel.sellerVerified && <Verified size={14} />
                )}
              </div>
              <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600, marginTop: 2, fontFamily: "'Spline Sans Mono',monospace" }}>
                {sel.sellerVerified ? t('Dorm-Verified') : t('Student')} · {sel.building || 'JIU'} · {t('chat in-app')}
                {sel.sellerCashless ? <span style={{ color: '#1E9E5A' }}> · 💳 {t('Cashless ready')}</span> : null}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#9A9A94' }} />
          </div>

          {/* security post note */}
          <div style={{ background: '#E8F2F7', border: '1px solid #BFDCE8', borderRadius: 0, padding: '14px 15px', display: 'flex', gap: 12, marginBottom: 22 }}>
            <div style={{ color: 'var(--accent,#000000)', flex: 'none' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t('Protected handover')}</div>
              <div style={{ fontSize: 12.5, color: '#4A5A50', lineHeight: 1.55 }}>{t('Order in-app, pay at handover — cash or the seller’s QR. Security Post drop-offs come with 📸 photo proof, and every trade has a 🔑 code + receipt.')}</div>
            </div>
          </div>

          {/* share — every listing has a public link; group shares are free marketing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, letterSpacing: '.06em', color: '#9A9A94', flex: 'none' }}>{t('SHARE')}</span>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="lok-btn"
              style={{ border: '1px solid #BFE3CC', background: '#EFFAF3', color: '#1DA851', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '8px 13px', borderRadius: 0, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {t('🟢 WhatsApp')}
            </a>
            <button onClick={doCopy} className="lok-btn" style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', color: copied ? '#1E9E5A' : '#1E1E1E', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '8px 13px', borderRadius: 0, cursor: 'pointer' }}>
              {copied ? t('Copied ✓') : t('🔗 Copy link')}
            </button>
            {canNativeShare && (
              <button onClick={doNativeShare} className="lok-btn" style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', color: '#1E1E1E', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, padding: '8px 13px', borderRadius: 0, cursor: 'pointer' }}>
                {t('More…')}
              </button>
            )}
          </div>

          {/* actions */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {guest ? (
              <>
                <button className="lok-btn" onClick={goSignup} style={{ border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(0,0,0,.6)' }}>{t("Sign up to buy & message — it's free")}</button>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#8B8B86', fontWeight: 500 }}>{t("You're browsing as a guest. Create an account to trade with")} {sel.seller}.</div>
              </>
            ) : isOwner ? (
              <>
                {/* featured boost — request the gold slot; admin confirms payment manually */}
                <div style={{ border: '1px solid #BFDCE8', background: '#EDF5F9', padding: '12px 14px' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3 }}>🚀 {t('Boost this listing')}</div>
                  <div style={{ fontSize: 12, color: '#27607A', lineHeight: 1.5, marginBottom: 9 }}>
                    {t('Get the FEATURED spot at the top of the homepage. Transfer the fee, upload your receipt, and the LOKITA team activates it after checking.')}
                  </div>
                  {boostState === 'pay' && boostPay ? (
                    <ManualFeePay
                      title={'🚀 ' + t('Transfer the boost fee')}
                      amount={boostPay.amount}
                      uploaded={false}
                      onUpload={(file) => attachBoostProof(boostPay.id, file)}
                    />
                  ) : boostState === 'sent' ? (
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1E9E5A' }}>✓ {t('Boost requested — the LOKITA team will chat you shortly.')}</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {([{ days: 3 as const, amount: 3000 }, { days: 7 as const, amount: 5000 }]).map((o) => (
                        <button
                          key={o.days}
                          className="lok-btn"
                          disabled={boostState === 'busy'}
                          onClick={async () => {
                            setBoostState('busy')
                            try {
                              const id = await boostListing(o.days)
                              if (!id) {
                                setBoostState('idle')
                                return
                              }
                              setBoostPay({ id, amount: o.amount })
                              setBoostState('pay')
                            } catch (e) {
                              setBoostState('idle')
                              alert(t('Could not request the boost:') + ' ' + (errText(e, t('unknown error'))))
                            }
                          }}
                          style={{ border: '1px solid #519BB8', background: '#FFFFFF', color: '#27607A', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 0, cursor: 'pointer' }}
                        >
                          {o.days} {t('days')} · Rp {o.amount.toLocaleString('id-ID')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="lok-btn" onClick={onDelete} disabled={deleting} style={{ border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer' }}>
                  {deleting ? t('Removing…') : t('Remove listing')}
                </button>
              </>
            ) : (
              <>
                <button className="lok-btn" onClick={chatSeller} style={{ border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <MessageBubble size={17} />
                  {t('Message seller')}
                </button>
                {/* make an offer — lands in the seller's chat with the product card attached */}
                {sel.isGiveaway ? null : offerOpen ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="lok-in" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: '#F5F5F3', border: '1.5px solid #D8D8D4', borderRadius: 0, padding: '0 12px' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#8B8B86' }}>Rp</span>
                      <input
                        autoFocus
                        inputMode="numeric"
                        value={offerVal}
                        onChange={(e) => setOfferVal(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && Number(offerVal) > 0) sendOffer(Number(offerVal)) }}
                        placeholder={t('Your offer')}
                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '12px 0', color: '#000000' }}
                      />
                    </div>
                    <button
                      className="lok-btn"
                      disabled={!(Number(offerVal) > 0)}
                      onClick={() => sendOffer(Number(offerVal))}
                      style={{ border: 'none', background: Number(offerVal) > 0 ? '#519BB8' : '#E6E6E3', color: '#000000', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: '0 18px', borderRadius: 0, cursor: Number(offerVal) > 0 ? 'pointer' : 'default' }}
                    >
                      {t('Send offer')} →
                    </button>
                    <button onClick={() => setOfferOpen(false)} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', width: 44, borderRadius: 0, cursor: 'pointer', color: '#4A4B4E' }}>✕</button>
                  </div>
                ) : (
                  <button className="lok-btn" onClick={() => setOfferOpen(true)} style={{ border: '1px solid #519BB8', background: '#EDF5F9', color: '#27607A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 0, cursor: 'pointer' }}>
                    💰 {t('Make an offer')}
                  </button>
                )}
                <button className="lok-btn" onClick={openCheckout} style={{ border: 'none', background: sel.isGiveaway ? '#1E9E5A' : 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(0,0,0,.6)' }}>
                  {sel.isGiveaway ? '💝 ' + t('Claim it — FREE') : `${t('Buy now')} · ${sel.price}`}
                </button>
                <ReportForm targetType="listing" targetId={sel.id} label={t('this listing')} />
              </>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}
