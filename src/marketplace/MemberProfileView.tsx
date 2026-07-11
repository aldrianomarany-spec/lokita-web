import { useEffect, useState } from 'react'
import { useM } from './context'
import {
  fetchMemberProfile,
  fetchMemberStats,
  fetchMemberListings,
  fetchReviewsForUser,
  getUserId,
  type MemberProfileInfo,
  type ReviewRow,
} from '../lib/api'
import ListingCard from './ListingCard'
import ReportForm from './ReportForm'
import { MessageBubble, ShieldCheck, Verified } from '../components/Icons'
import type { EnrichedItem } from '../types'

// Full public profile of another member: details, live status, what they're
// selling, how many trades they've completed, and their reviews.
const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const metaField = (label: string, value: string) =>
  value ? (
    <div>
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#17181A' }}>{value}</div>
    </div>
  ) : null

export default function MemberProfileView() {
  const { state, closeMember, openRequestChat } = useM()
  const s = state
  const id = s.memberId
  const [info, setInfo] = useState<MemberProfileInfo | null>(null)
  const [stats, setStats] = useState<{ selling: number; sold: number } | null>(null)
  const [items, setItems] = useState<EnrichedItem[] | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    setInfo(null)
    setStats(null)
    setItems(null)
    setReviews(null)
    setMissing(false)
    if (!id) return
    getUserId().then((u) => active && setUid(u))
    const viewerFloor = s.profile.floor ? s.profile.floor.toLowerCase() : null
    fetchMemberProfile(id)
      .then((p) => {
        if (!active) return
        if (!p) setMissing(true)
        else setInfo(p)
      })
      .catch(() => active && setMissing(true))
    fetchMemberStats(id).then((st) => active && setStats(st)).catch(() => active && setStats({ selling: 0, sold: 0 }))
    fetchMemberListings(id, viewerFloor).then((l) => active && setItems(l)).catch(() => active && setItems([]))
    fetchReviewsForUser(id).then((r) => active && setReviews(r)).catch(() => active && setReviews([]))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const isOnline = !!id && s.onlineIds.includes(id)
  const isMe = !!id && id === uid
  const rating = reviews && reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '—'

  const backBtn = (
    <button onClick={closeMember} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', padding: '9px 14px', borderRadius: 0, cursor: 'pointer', color: '#4A4B4E', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>‹ Back</button>
  )

  if (missing) {
    return (
      <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
        {backBtn}
        <div style={{ background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: '52px 32px', textAlign: 'center', color: '#8B8B86', marginTop: 18 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🫥</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#17181A' }}>This member no longer exists</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 940, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>{backBtn}</div>

      {/* identity */}
      <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '26px 28px', display: 'flex', gap: 22, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={{ width: 88, height: 88, borderRadius: 0, background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A2B2E', fontWeight: 800, fontSize: 34, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
            {info?.photo ? <img src={info.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (info?.name || s.memberName || '?').charAt(0).toUpperCase()}
          </div>
          <span title={isOnline ? 'Online now' : 'Offline'} style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', background: isOnline ? '#3DBB6E' : '#C9C2B2', border: '3px solid #FFFFFF' }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>{info?.name || s.memberName || 'Member'}</h1>
            {info?.verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#E9EDFC', background: 'var(--accent,#2A5FA8)', padding: '6px 11px', borderRadius: 0 }}>
                <Verified size={13} checkColor="#E9EDFC" /> Dorm-Verified
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 5, color: isOnline ? '#1E9E5A' : '#8B8B86' }}>{isOnline ? '● Online now' : '● Offline'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 14 }}>
            {metaField('BUILDING', info ? [info.building, info.floor].filter(Boolean).join(' · ') : '')}
            {metaField('BATCH', info?.batch || '')}
            {metaField('STANDING', info?.standing || '')}
            {metaField('MEMBER SINCE', info?.since || '')}
          </div>
        </div>
        {!isMe && (
          <button onClick={() => id && openRequestChat(id)} className="lok-btn" style={{ flex: 'none', border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 18px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px -6px rgba(53,85,230,.6)' }}>
            <MessageBubble size={15} />
            Message
          </button>
        )}
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { value: stats ? String(stats.selling) : '…', label: 'Selling now', color: 'var(--accent,#2A5FA8)' },
          { value: stats ? String(stats.sold) : '…', label: 'Items sold', color: '#1E9E5A' },
          { value: rating, label: 'Rating', color: '#9A6A12' },
          { value: reviews ? String(reviews.length) : '…', label: 'Reviews', color: '#17181A' },
        ].map((st) => (
          <div key={st.label} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 24, color: st.color }}>{st.value}</div>
            <div style={{ fontSize: 11, color: '#8B8B86', fontWeight: 700, marginTop: 3 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* trust note */}
      <div style={{ background: '#E9EDFC', border: '1px solid #C7D2F2', borderRadius: 0, padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', marginBottom: 24 }}>
        <span style={{ color: 'var(--accent,#2A5FA8)', flex: 'none', display: 'flex' }}><ShieldCheck size={19} /></span>
        <span style={{ fontSize: 12.5, color: '#4A5A50', fontWeight: 600 }}>All trades are paid in-app and exchanged via the campus Security Post — no risky meetups.</span>
      </div>

      {/* listings */}
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 12 }}>
        SELLING NOW {items ? `· ${items.length}` : ''}
      </div>
      {items === null ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ background: '#F5F5F3', border: '1px dashed #C9C9C5', borderRadius: 0, padding: 24, textAlign: 'center', color: '#8B8B86', fontSize: 13, marginBottom: 28 }}>Nothing listed right now.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(228px,1fr))', gap: 18, marginBottom: 30 }}>
          {items.map((it, i) => (
            <ListingCard key={it.id} it={it} index={i} />
          ))}
        </div>
      )}

      {/* reviews */}
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', margin: '4px 0 12px' }}>
        WHAT BUYERS SAY {reviews && reviews.length ? `· ★ ${rating}` : ''}
      </div>
      {reviews === null ? (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <span className="lok-spin" style={{ width: 20, height: 20, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ background: '#F5F5F3', border: '1px dashed #C9C9C5', borderRadius: 0, padding: 22, textAlign: 'center', color: '#8B8B86', fontSize: 13, marginBottom: 30 }}>
          No reviews yet — be the first to trade with {info?.name || 'them'}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 34 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ECECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#2A2B2E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.reviewer_name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.reviewer_name}</div>
                  <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94' }}>{timeAgo(r.created_at)}</div>
                </div>
                <div style={{ fontSize: 13, color: '#E7A81E', letterSpacing: 1, flex: 'none' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              {r.comment && <p style={{ fontSize: 13, lineHeight: 1.55, color: '#4A4B4E', margin: 0 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* report — never on your own profile */}
      {!isMe && id && (
        <div style={{ maxWidth: 440, marginBottom: 34 }}>
          <ReportForm targetType="user" targetId={id} label="this member" />
        </div>
      )}
    </div>
  )
}
