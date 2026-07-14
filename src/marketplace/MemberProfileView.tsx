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
import { useLang } from '../i18n'

// Full public profile of another member: details, live status, what they're
// selling, how many trades they've completed, and their reviews.
const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Relative "last seen" label; null → older than 7 days / unknown.
const lastSeenLabel = (iso: string | null, t: (s: string) => string): string | null => {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return t('just now')
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d` : null
}

const metaField = (label: string, value: string) =>
  value ? (
    <div>
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#000000' }}>{value}</div>
    </div>
  ) : null

export default function MemberProfileView() {
  const { state, closeMember, openRequestChat, blockMember, unblockMember, goSignup, openProfile } = useM()
  const { t } = useLang()
  const s = state
  const id = s.memberId
  const [copied, setCopied] = useState(false)
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
  const seen = !isOnline && info ? lastSeenLabel(info.last_seen_at, t) : null
  const isMe = !!id && id === uid
  const isBlocked = !!id && s.blockedIds.includes(id)
  const avgRating = reviews && reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null
  const rating = avgRating != null ? avgRating.toFixed(1) : '—'
  const isTopSeller = !!stats && stats.sold >= 5 && avgRating != null && avgRating >= 4.5

  const backBtn = (
    <button onClick={closeMember} className="lok-navi" style={{ border: '1px solid #D8D8D4', background: '#F5F5F3', padding: '9px 14px', borderRadius: 0, cursor: 'pointer', color: '#4A4B4E', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>{t('‹ Back')}</button>
  )

  // 🔒 privacy: member profiles (name, building, listings, chat) are for
  // members with a complete profile — same bar as item details
  const pp = s.profile
  const memberReady = !s.guest && !!(pp.name && pp.building && pp.floor && pp.whatsapp)
  if (!memberReady && !isMe) {
    return (
      <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
        {backBtn}
        <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '52px 32px', textAlign: 'center', marginTop: 18 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🔒</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#000000', marginBottom: 8 }}>{t('Members only')}</div>
          <div style={{ fontSize: 13.5, color: '#5F6063', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 18px' }}>
            {s.guest
              ? t('Item details, sellers and trading are for signed-in members — that keeps names and buildings inside the dorm community.')
              : t('Finish your profile (building, floor, WhatsApp) to unlock item details, chat and trading — it keeps LOKITA members-only.')}
          </div>
          <button
            onClick={() => (s.guest ? goSignup() : openProfile())}
            className="lok-btn"
            style={{ border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '13px 26px', borderRadius: 0, cursor: 'pointer' }}
          >
            {s.guest ? t("Sign up — it's free") : t('Complete my profile')}
          </button>
        </div>
      </div>
    )
  }

  if (missing) {
    return (
      <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 760, margin: '0 auto' }}>
        {backBtn}
        <div style={{ background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: '52px 32px', textAlign: 'center', color: '#8B8B86', marginTop: 18 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🫥</div>
          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#000000' }}>{t('This member no longer exists')}</div>
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
          <div style={{ width: 88, height: 88, borderRadius: 0, background: '#DBE1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E1E1E', fontWeight: 800, fontSize: 34, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
            {info?.photo ? <img src={info.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (info?.name || s.memberName || '?').charAt(0).toUpperCase()}
          </div>
          <span title={isOnline ? t('Online now') : t('Offline')} style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', background: isOnline ? '#3DBB6E' : '#C9C2B2', border: '3px solid #FFFFFF' }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>{info?.name || s.memberName || t('Member')}</h1>
            {info?.role === 'admin' ? (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 8.5, fontWeight: 700, background: '#519BB8', color: '#FFFFFF', padding: '2px 6px', letterSpacing: 1, borderRadius: 0 }}>🛡️ {t('ADMIN')}</span>
            ) : (
              info?.verified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#E8F2F7', background: 'var(--accent,#000000)', padding: '6px 11px', borderRadius: 0 }}>
                  <Verified size={13} checkColor="#E8F2F7" /> {t('Dorm-Verified')}
                </span>
              )
            )}
            {isTopSeller && (
              <span title={t('5+ completed sales with a 4.5★+ rating')} style={{ background: '#519BB8', color: '#FFFFFF', fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 700, padding: '3px 8px', letterSpacing: 1, borderRadius: 0 }}>
                ⭐ {t('TOP SELLER')}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 5, color: isOnline ? '#1E9E5A' : '#8B8B86' }}>{isOnline ? '● ' + t('Online now') : '● ' + t('Offline')}</div>
          {!isOnline && seen && (
            <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2, color: '#8B8B86' }}>{t('Last seen')} {seen}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 14 }}>
            {metaField(t('BUILDING'), info ? [info.building, info.floor].filter(Boolean).join(' · ') : '')}
            {metaField(t('BATCH'), info?.batch || '')}
            {metaField(t('STANDING'), info?.standing || '')}
            {metaField(t('MAJOR'), info?.major ? t(info.major) : '')}
            {metaField(t('MEMBER SINCE'), info?.since || '')}
          </div>
        </div>
        {/* action column: fixed beside the identity on desktop; wraps to a
            full-width row of stretching buttons on phones */}
        <div style={{ flex: '1 1 190px', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!isMe && !isBlocked && (
            <button onClick={() => id && openRequestChat(id)} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '12px 18px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 16px -6px rgba(0,0,0,.6)' }}>
              <MessageBubble size={15} />
              {t('Message')}
            </button>
          )}
          {/* shareable storefront link — "all my stuff" in one URL */}
          <button
            onClick={async () => {
              const url = `${window.location.origin}/app?member=${id}`
              const text = `${info?.name || t('A neighbour')} ${t('is selling on LOKITA — see their whole storefront:')} ${url}`
              if (typeof navigator.share === 'function') {
                navigator.share({ title: 'LOKITA', text, url }).catch(() => {})
                return
              }
              try {
                await navigator.clipboard.writeText(url)
              } catch { /* clipboard blocked — nothing to do */ }
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            }}
            className="lok-btn"
            style={{ border: '1px solid #D8D8D4', background: '#FFFFFF', color: copied ? '#1E9E5A' : '#1E1E1E', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '10px 14px', borderRadius: 0, cursor: 'pointer' }}
          >
            {copied ? t('Copied ✓') : '🔗 ' + t(isMe ? 'Share my storefront' : 'Share storefront')}
          </button>
          {!isMe && id && (
            <button
              onClick={() => {
                if (isBlocked) unblockMember(id)
                else if (window.confirm(t("Block this member? You won't see their listings or messages, and they can't message you."))) blockMember(id)
              }}
              className="lok-btn"
              style={{ border: `1px solid ${isBlocked ? '#BFDCE8' : '#E4C4B8'}`, background: isBlocked ? '#EDF5F9' : '#FBEEE9', color: isBlocked ? '#2F6B85' : '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, padding: '10px 14px', borderRadius: 0, cursor: 'pointer' }}
            >
              {isBlocked ? '✓ ' + t('Unblock') : '🚫 ' + t('Block')}
            </button>
          )}
        </div>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { value: stats ? String(stats.selling) : '…', label: t('Selling now'), color: 'var(--accent,#000000)' },
          { value: stats ? String(stats.sold) : '…', label: t('Items sold'), color: '#1E9E5A' },
          { value: rating, label: t('Rating'), color: '#9A6A12' },
          { value: reviews ? String(reviews.length) : '…', label: t('Reviews'), color: '#000000' },
        ].map((st) => (
          <div key={st.label} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 24, color: st.color }}>{st.value}</div>
            <div style={{ fontSize: 11, color: '#8B8B86', fontWeight: 700, marginTop: 3 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* trust note */}
      <div style={{ background: '#E8F2F7', border: '1px solid #BFDCE8', borderRadius: 0, padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', marginBottom: 24 }}>
        <span style={{ color: 'var(--accent,#000000)', flex: 'none', display: 'flex' }}><ShieldCheck size={19} /></span>
        <span style={{ fontSize: 12.5, color: '#4A5A50', fontWeight: 600 }}>{t('All orders are placed in-app and handed over at the LOKITA desk — no risky meetups.')}</span>
      </div>

      {/* listings */}
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', marginBottom: 12 }}>
        {t('SELLING NOW')} {items ? `· ${items.length}` : ''}
      </div>
      {items === null ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <span className="lok-spin" style={{ width: 22, height: 22, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ background: '#F5F5F3', border: '1px dashed #C9C9C5', borderRadius: 0, padding: 24, textAlign: 'center', color: '#8B8B86', fontSize: 13, marginBottom: 28 }}>{t('Nothing listed right now.')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(228px,1fr))', gap: 18, marginBottom: 30 }}>
          {items.map((it, i) => (
            <ListingCard key={it.id} it={it} index={i} />
          ))}
        </div>
      )}

      {/* reviews */}
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', letterSpacing: '.08em', margin: '4px 0 12px' }}>
        {t('WHAT BUYERS SAY')} {reviews && reviews.length ? `· ★ ${rating}` : ''}
      </div>
      {reviews === null ? (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <span className="lok-spin" style={{ width: 20, height: 20, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ background: '#F5F5F3', border: '1px dashed #C9C9C5', borderRadius: 0, padding: 22, textAlign: 'center', color: '#8B8B86', fontSize: 13, marginBottom: 30 }}>
          {t('No reviews yet — be the first to trade with')} {info?.name || t('them')}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 34 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ECECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.reviewer_name.charAt(0)}</div>
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
