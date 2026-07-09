import { useState } from 'react'
import { useM } from '../context'
import { T } from '../../theme'
import { tagStyle } from '../tagStyle'
import { useIsPhone } from '../useIsMobile'
import Overlay, { stop } from './Overlay'
import { ChevronRight, Heart, MapPin, MessageBubble, ShieldCheck, Verified } from '../../components/Icons'

export default function DetailModal() {
  const { state, closeDetail, chatSeller, openCheckout, openSellerProfile, deleteMyListing, toggleSaveItem } = useM()
  const [deleting, setDeleting] = useState(false)
  const isPhone = useIsPhone()
  const sel = state.sel
  if (!sel) return null

  // derive the tinted placeholder + tag from tone/flags so the modal matches
  // the card aesthetic.
  const t = T[sel.tone]
  const ts = tagStyle(sel)
  const proxTag = (sel as { proxTag?: string }).proxTag || ''
  const hasPhoto = !!sel.photoUrl
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
      <div onClick={stop} style={{ background: '#FBF8F1', borderRadius: isPhone ? 20 : 26, overflow: 'hidden', width: '100%', maxWidth: 900, maxHeight: isPhone ? '94vh' : '88vh', display: 'flex', flexDirection: isPhone ? 'column' : 'row', overflowY: isPhone ? 'auto' : 'hidden', animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(32,30,24,.5)' }}>
        {/* image panel — full width on phone, left column on desktop */}
        <div style={{ width: isPhone ? '100%' : '47%', flex: 'none', background: t.tint, position: 'relative', minHeight: isPhone ? 240 : 480, height: isPhone ? 240 : 'auto', overflow: 'hidden' }}>
          {hasPhoto ? (
            <img src={sel.photoUrl!} alt={sel.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 14px,transparent 14px 28px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 12, color: t.label, textAlign: 'center', padding: '0 24px' }}>{sel.photo}</span>
            </div>
          )}
          {ts.tag && <span style={{ position: 'absolute', top: 16, left: 16, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 600, color: ts.tagFg, background: ts.tagBg, padding: '5px 10px', borderRadius: 8, letterSpacing: '.04em' }}>{ts.tag}</span>}
          {!isOwner && (
            <button
              onClick={() => toggleSaveItem(sel.id)}
              className="lok-heart"
              title={isSaved ? 'Remove from saved' : 'Save item'}
              style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(251,248,241,.92)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#D4562F' : '#5A5648', boxShadow: '0 2px 8px rgba(32,30,24,.15)' }}
            >
              <Heart fill={isSaved ? '#D4562F' : 'none'} size={19} />
            </button>
          )}
        </div>

        {/* right content — parent scrolls on phone, this panel scrolls on desktop */}
        <div style={{ flex: 1, padding: isPhone ? '20px 20px 26px' : '30px 32px', overflowY: isPhone ? 'visible' : 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10.5, color: '#A29C8B', letterSpacing: '.06em', paddingTop: 6 }}>{sel.cat}</span>
            <button onClick={closeDetail} className="lok-navi" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', width: 36, height: 36, borderRadius: 11, fontSize: 16, cursor: 'pointer', color: '#5A5648', flex: 'none' }}>✕</button>
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 27, fontWeight: 800, letterSpacing: '-.02em', margin: '6px 0 8px', lineHeight: 1.12 }}>{sel.title}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 16 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--accent,#2A5FA8)' }}>{sel.price}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#3A362C', background: '#F1ECE1', padding: '8px 12px', borderRadius: 10 }}>Condition · {sel.cond}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#3A362C', background: '#F1ECE1', padding: '8px 12px', borderRadius: 10 }}>
              <MapPin size={12} />
              {proxTag}
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: '#5A5648', margin: '0 0 18px' }}>{sel.desc}</p>

          {/* seller card */}
          <div onClick={() => openSellerProfile(sel.ownerId ?? null, sel.seller)} className="lok-btn" style={{ cursor: 'pointer', background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 16, padding: 15, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: t.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{sel.sellerInitial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 15 }}>
                {sel.seller}
                {sel.sellerVerified && <Verified size={14} />}
              </div>
              <div style={{ fontSize: 12, color: '#8A8578', fontWeight: 600, marginTop: 2, fontFamily: "'Spline Sans Mono',monospace" }}>{sel.sellerVerified ? 'Dorm-Verified' : 'Student'} · {sel.building || 'JIU'} · chat in-app</div>
            </div>
            <ChevronRight size={18} style={{ color: '#A29C8B' }} />
          </div>

          {/* security post note */}
          <div style={{ background: '#EAF1EC', border: '1px solid #CFE2D7', borderRadius: 16, padding: '14px 15px', display: 'flex', gap: 12, marginBottom: 22 }}>
            <div style={{ color: 'var(--accent,#2A5FA8)', flex: 'none' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Security Post drop-off</div>
              <div style={{ fontSize: 12.5, color: '#4A5A50', lineHeight: 1.55 }}>Pay in-app now — your money is held in escrow. Seller drops it at the campus Security Post; pick it up whenever suits you. No meetups.</div>
            </div>
          </div>

          {/* actions */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {isOwner ? (
              <button className="lok-btn" onClick={onDelete} disabled={deleting} style={{ border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 14, cursor: 'pointer' }}>
                {deleting ? 'Removing…' : 'Remove listing'}
              </button>
            ) : (
              <>
                <button className="lok-btn" onClick={chatSeller} style={{ border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <MessageBubble size={17} />
                  Message seller
                </button>
                <button className="lok-btn" onClick={openCheckout} style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, padding: 14, borderRadius: 14, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(42,95,168,.6)' }}>Buy now · {sel.price}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}
