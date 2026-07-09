import { useEffect, useState } from 'react'
import { useM } from '../context'
import { fetchReviewsForUser, type ReviewRow } from '../../lib/api'
import Overlay, { stop } from './Overlay'
import { Verified } from '../../components/Icons'

const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SellerProfileModal() {
  const { state, closeSellerProfile } = useM()
  const id = state.sellerId
  const name = state.sellerName || 'Seller'
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)

  useEffect(() => {
    let active = true
    if (!id) {
      setReviews([])
      return
    }
    fetchReviewsForUser(id)
      .then((r) => active && setReviews(r))
      .catch(() => active && setReviews([]))
    return () => {
      active = false
    }
  }, [id])

  const rating = reviews && reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '—'

  return (
    <Overlay onClose={closeSellerProfile} z={85}>
      <div onClick={stop} style={{ background: '#FBF8F1', borderRadius: 26, padding: '24px 28px 28px', width: '100%', maxWidth: 480, animation: 'lok-pop .26s cubic-bezier(.2,.8,.3,1) both', boxShadow: '0 40px 90px -20px rgba(32,30,24,.5)', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={closeSellerProfile} className="lok-navi" style={{ border: '1px solid #E4DDCE', background: '#F4EFE5', width: 34, height: 34, borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#5A5648' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, margin: '-6px 0 18px' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#EAE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#3A362C', fontFamily: "'Bricolage Grotesque',sans-serif", flex: 'none' }}>{name.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20 }}>{name}</div>
              <Verified size={15} />
            </div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#8A8578', marginTop: 3 }}>★ {rating} · {reviews ? reviews.length : 0} review{reviews && reviews.length === 1 ? '' : 's'} · Dorm-Verified</div>
          </div>
        </div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 11 }}>WHAT BUYERS SAY</div>

        {reviews === null ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ background: '#F4EFE5', border: '1px dashed #D8CFBB', borderRadius: 14, padding: 22, textAlign: 'center', color: '#8A8578', fontSize: 13 }}>No reviews yet — be the first to trade with {name}.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EAE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.reviewer_name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.reviewer_name}</div>
                    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B' }}>{timeAgo(r.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#E7A81E', letterSpacing: 1, flex: 'none' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                {r.comment && <p style={{ fontSize: 13, lineHeight: 1.55, color: '#5A5648', margin: 0 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  )
}
