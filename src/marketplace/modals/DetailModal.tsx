import { useState } from 'react'
import { useM } from '../context'
import { T } from '../../theme'
import { tagStyle } from '../tagStyle'
import { useIsPhone } from '../useIsMobile'
import Overlay, { stop } from './Overlay'
import ReportForm from '../ReportForm'
import { ChevronRight, MapPin, MessageBubble, ShieldCheck, Star, Verified } from '../../components/Icons'

export default function DetailModal() {
  const { state, closeDetail, chatSeller, openCheckout, openMember, deleteMyListing, toggleSaveItem, goSignup } = useM()
  const [deleting, setDeleting] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const isPhone = useIsPhone()
  const guest = state.guest
  const sel = state.sel
  if (!sel) return null

  // derive the tinted placeholder + tag from tone/flags so the modal matches
  // the card aesthetic.
  const t = T[sel.tone]
  const ts = tagStyle(sel)
  const proxTag = (sel as { proxTag?: string }).proxTag || ''
  const photos = sel.photoUrls && sel.photoUrls.length ? sel.photoUrls : sel.photoUrl ? [sel.photoUrl] : []
  const mainPhoto = photos[Math.min(photoIdx, photos.length - 1)] || null
  const hasPhoto = !!mainPhoto
  const isOwner = !!sel.mine
  const isSaved = !!state.saved[sel.id]

  const onDelete = async () => {
    if (deleting) return
    if (!window.confirm('Remove this listing? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteMyListing(sel.id)
      closeDetail()
    } catch (e) {
      setDeleting(false)
      alert('Could not remove listing: ' + (e instanceof Error ? e.message : 'unknown error'))
    }
  }

  return (
    <Overlay onClose={closeDetail}>
      <div onClick={stop} style={{ background: '#FFFFFF', borderRadius: isPhone ? 20 : 26, overflow: 'hidden', width: '100%', maxWidth: 900, maxHeight: isPhone ? '94vh' : '88vh', display: 'flex', flexDirection: isPhone ? 'column' : 'row', overflowY: isPhone ? 'auto' : 'hidden', animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(18,19,21,.5)' }}>
        {/* image panel — full width on phone, left column on desktop */}
        <div style={{ width: isPhone ? '100%' : '47%', flex: 'none', background: t.tint, position: 'relative', minHeight: isPhone ? 240 : 480, height: isPhone ? 240 : 'auto', overflow: 'hidden' }}>
          {hasPhoto ? (
            <img src={mainPhoto!} alt={sel.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 14px,transparent 14px 28px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 12, color: t.label, textAlign: 'center', padding: '0 24px' }}>{sel.photo}</span>
            </div>
          )}
          {ts.tag && <span style={{ position: 'absolute', top: 16, left: 16, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 600, color: ts.tagFg, background: ts.tagBg, padding: '5px 10px', borderRadius: 0, letterSpacing: '.04em' }}>{ts.tag}</span>}
          {!isOwner && !guest && (
            <button
              onClick={() => toggleSaveItem(sel.id)}
              className="lok-heart"
              title={isSaved ? 'Remove from saved' : 'Save item'}
              style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(251,248,241,.92)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#E7A81E' : '#4A4B4E', boxShadow: '0 2px 8px rgba(18,19,21,.15)' }}
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
                  style={{ flex: 'none', width: 48, height: 48, borderRadius: 0, overflow: 'hidden', padding: 0, cursor: 'pointer', border: i === Math.min(photoIdx, photos.length - 1) ? '2.5px solid #FFFFFF' : '2.5px solid rgba(251,248,241,.45)', boxShadow: '0 2px 8px rgba(18,19,21,.3)' }}
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
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, color: '#9A9A94', letterSpacing: '.06em', paddingTop: 6 }}>{sel.cat}</span>
            <button onClick={closeDetail} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', width: 36, height: 36, borderRadius: 0, fontSize: 16, cursor: 'pointer', color: '#4A4B4E', flex: 'none' }}>✕</button>
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', margin: '6px 0 8px', lineHeight: 1.12 }}>{sel.title}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: isOwner && (sel.platformFee || 0) > 0 ? 6 : 16 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--accent,#101113)' }}>{sel.price}</span>
          </div>
          {/* only the owner sees the fee split — buyers just see the listed price */}
          {isOwner && (sel.platformFee || 0) > 0 && (
            <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600, marginBottom: 14 }}>
              You receive <b style={{ color: '#3D7A54' }}>Rp {(sel.priceNum - (sel.platformFee || 0)).toLocaleString('id-ID')}</b> when it sells · Rp {(sel.platformFee || 0).toLocaleString('id-ID')} LOKITA fee included
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#2A2B2E', background: '#ECECEA', padding: '8px 12px', borderRadius: 0 }}>Condition · {sel.cond}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#2A2B2E', background: '#ECECEA', padding: '8px 12px', borderRadius: 0 }}>
              <MapPin size={12} />
              {proxTag}
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: '#4A4B4E', margin: '0 0 18px' }}>{sel.desc}</p>

          {sel.bundleItems && sel.bundleItems.length > 0 && (
            <div style={{ background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#7E8154', letterSpacing: '.06em', marginBottom: 9 }}>WHAT'S IN THIS BUNDLE · {sel.bundleItems.length} ITEMS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sel.bundleItems.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: '#2A2B2E' }}>
                    <span style={{ width: 17, height: 17, borderRadius: 0, background: '#E4E5D3', color: '#7E8154', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flex: 'none' }}>✓</span>
                    {it}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* seller card */}
          <div onClick={() => openMember(sel.ownerId ?? null, sel.seller)} className="lok-btn" style={{ cursor: 'pointer', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: 15, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: t.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2A2B2E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{sel.sellerInitial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 15 }}>
                {sel.seller}
                {sel.sellerVerified && <Verified size={14} />}
              </div>
              <div style={{ fontSize: 12, color: '#8B8B86', fontWeight: 600, marginTop: 2, fontFamily: "'Spline Sans Mono',monospace" }}>{sel.sellerVerified ? 'Dorm-Verified' : 'Student'} · {sel.building || 'JIU'} · chat in-app</div>
            </div>
            <ChevronRight size={18} style={{ color: '#9A9A94' }} />
          </div>

          {/* security post note */}
          <div style={{ background: '#F6F0E3', border: '1px solid #E2D3AF', borderRadius: 0, padding: '14px 15px', display: 'flex', gap: 12, marginBottom: 22 }}>
            <div style={{ color: 'var(--accent,#101113)', flex: 'none' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Security Post drop-off</div>
              <div style={{ fontSize: 12.5, color: '#4A5A50', lineHeight: 1.55 }}>Pay in-app now — your money is held in escrow. Seller drops it at the campus Security Post; pick it up whenever suits you. No meetups.</div>
            </div>
          </div>

          {/* actions */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {guest ? (
              <>
                <button className="lok-btn" onClick={goSignup} style={{ border: 'none', background: 'var(--accent,#101113)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(16,17,19,.6)' }}>Sign up to buy & message — it's free</button>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#8B8B86', fontWeight: 500 }}>You're browsing as a guest. Create an account to trade with {sel.seller}.</div>
              </>
            ) : isOwner ? (
              <button className="lok-btn" onClick={onDelete} disabled={deleting} style={{ border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer' }}>
                {deleting ? 'Removing…' : 'Remove listing'}
              </button>
            ) : (
              <>
                <button className="lok-btn" onClick={chatSeller} style={{ border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#17181A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <MessageBubble size={17} />
                  Message seller
                </button>
                <button className="lok-btn" onClick={openCheckout} style={{ border: 'none', background: 'var(--accent,#101113)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 0, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(16,17,19,.6)' }}>Buy now · {sel.price}</button>
                <ReportForm targetType="listing" targetId={sel.id} label="this listing" />
              </>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}
