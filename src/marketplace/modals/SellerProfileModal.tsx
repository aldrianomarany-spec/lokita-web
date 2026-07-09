import { useM } from '../context'
import { SELLER_REVIEWS } from '../../data'
import { T } from '../../theme'
import Overlay, { stop } from './Overlay'
import { Verified } from '../../components/Icons'

export default function SellerProfileModal() {
  const { state, enrichedItems, closeSellerProfile } = useM()
  const name = state.sellerName
  if (!name) return null

  const raw = (state.reviewsBySeller[name] || []).concat(SELLER_REVIEWS[name] || [])
  const reviews = raw.map((r) => ({
    ...r,
    tint: (T[r.tone] || T.sand).tint,
    starStr: '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars),
  }))
  const item = enrichedItems.find((x) => x.seller === name)
  const tint = item ? T[item.tone].tint : '#EAE1CB'
  const rating = reviews.length ? (reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1) : '—'

  return (
    <Overlay onClose={closeSellerProfile} z={85}>
      <div onClick={stop} style={{ background: '#FBF8F1', borderRadius: 26, padding: '24px 28px 28px', width: '100%', maxWidth: 480, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(32,30,24,.5)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={closeSellerProfile} className="lok-navi" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', width: 34, height: 34, borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#5A5648' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, margin: '-6px 0 18px' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#3A362C', fontFamily: "'Bricolage Grotesque',sans-serif", flex: 'none' }}>{name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20 }}>{name}</div>
              <Verified size={15} />
            </div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#8A8578', marginTop: 3 }}>★ {rating} · {reviews.length} reviews · Dorm-Verified</div>
          </div>
        </div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 11 }}>WHAT BUYERS SAY</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: r.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.by}</div>
                  <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B' }}>{r.item} · {r.ago}</div>
                </div>
                <div style={{ fontSize: 13, color: '#E7A81E', letterSpacing: 1, flex: 'none' }}>{r.starStr}</div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: '#5A5648', margin: 0 }}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  )
}
