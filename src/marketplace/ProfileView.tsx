import { useEffect, useRef, useState } from 'react'
import { useM } from './context'
import { fetchMyListings, fetchReviewsAboutMe, fetchMyWishlist, type DbListing, type ReviewRow } from '../lib/api'
import { uploadVerificationDoc, updatePassword } from '../lib/auth'
import { Camera, Edit, Logout, ShieldCheck, Verified } from '../components/Icons'
import { useLang } from '../i18n'
import { useIsPhone } from './useIsMobile'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const metaField = (label: string, value: string) => (
  <div>
    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#000000' }}>{value || '—'}</div>
  </div>
)

// gold chip for proven sellers (5+ sales, 4.5★+ average)
function TopSellerChip() {
  const { t } = useLang()
  return (
    <span title={t('5+ completed sales with a 4.5★+ rating')} style={{ background: '#519BB8', color: '#FFFFFF', fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 700, padding: '3px 8px', letterSpacing: 1, borderRadius: 0 }}>
      ⭐ {t('TOP SELLER')}
    </span>
  )
}

// verification badge styled by status
function VerifyBadge({ status }: { status?: string }) {
  const { t } = useLang()
  if (status === 'verified') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#2F6B85', background: '#E8F2F7', border: '1px solid #BFDCE8', padding: '6px 11px', borderRadius: 0 }}>
        <Verified size={14} checkColor="#E8F2F7" /> {t('Dorm-Verified Student')}
      </span>
    )
  }
  if (status === 'rejected') {
    return <span style={{ fontSize: 12, fontWeight: 800, color: '#B23A1B', background: '#FBEEE9', border: '1px solid #E4C4B8', padding: '6px 11px', borderRadius: 0 }}>{t('Verification rejected')}</span>
  }
  return <span style={{ fontSize: 12, fontWeight: 800, color: '#9A6A12', background: '#FBF2DD', border: '1px solid #ECD8A6', padding: '6px 11px', borderRadius: 0 }}>{t('Verification pending')}</span>
}

function SmallCard({ title, price, badge, badgeBg, badgeFg, dim, photoUrl, onClick }: { title: string; price: string; badge: string; badgeBg: string; badgeFg: string; dim?: boolean; photoUrl?: string | null; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="lok-card" style={{ cursor: onClick ? 'pointer' : 'default', background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, overflow: 'hidden', opacity: dim ? 0.62 : 1 }}>
      <div style={{ position: 'relative', height: 100, background: '#E6E6E3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photoUrl ? (
          <img src={photoUrl} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#C2C2BE" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-4-4-9 8" /></svg>
        )}
        <span style={{ position: 'absolute', top: 9, left: 9, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: badgeFg, background: badgeBg, padding: '3px 7px', borderRadius: 0, letterSpacing: '.04em' }}>{badge}</span>
      </div>
      <div style={{ padding: '11px 13px 13px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 15, color: '#000000', marginTop: 3 }}>{price}</div>
      </div>
    </div>
  )
}

const sectionH2: React.CSSProperties = { fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }
const emptyBox: React.CSSProperties = { background: '#FFFFFF', border: '1px dashed #C9C9C5', borderRadius: 0, padding: 28, textAlign: 'center', marginBottom: 32, color: '#8B8B86', fontSize: 13.5 }

// Change password + a plain-language privacy summary. Google-only accounts can
// set a password here too (adds email login alongside Google).
function AccountPrivacyCard() {
  const { t } = useLang()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [pwErr, setPwErr] = useState<string | null>(null)

  const savePw = async () => {
    if (pwState !== 'idle') return
    setPwErr(null)
    if (pw.length < 8) return setPwErr(t('Password must be at least 8 characters.'))
    if (pw !== pw2) return setPwErr(t("The two passwords don't match."))
    setPwState('saving')
    try {
      await updatePassword(pw)
      setPwState('done')
      setPw('')
      setPw2('')
      setTimeout(() => setPwState('idle'), 2500)
    } catch (e) {
      setPwState('idle')
      setPwErr(e instanceof Error ? e.message : t('Could not change the password.'))
    }
  }

  const pwField: React.CSSProperties = { flex: '1 1 180px', background: '#F5F5F3', border: '1.5px solid #D8D8D4', borderRadius: 0, padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', fontWeight: 500, color: '#000000' }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '20px 22px', marginBottom: 32 }}>
      {/* what's visible to whom — plain language */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px', background: '#F5F5F3', border: '1px solid #D8D8D4', borderRadius: 0, padding: '13px 15px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 7 }}>{t('👁️ OTHER MEMBERS SEE')}</div>
          <div style={{ fontSize: 12.5, color: '#4A4B4E', lineHeight: 1.7, fontWeight: 500 }}>{t('your name & photo · building + floor · batch & standing · rating, reviews & listings')}</div>
        </div>
        <div style={{ flex: '1 1 260px', background: '#E8F2F7', border: '1px solid #BFDCE8', borderRadius: 0, padding: '13px 15px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#4A8067', letterSpacing: '.06em', marginBottom: 7 }}>{t('🔒 ONLY YOU SEE')}</div>
          <div style={{ fontSize: 12.5, color: '#3E4F45', lineHeight: 1.7, fontWeight: 500 }}>{t('WhatsApp number · student ID · email · room number — never shown to other members. All contact happens in-app.')}</div>
        </div>
      </div>

      {/* change password */}
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 9 }}>{t('CHANGE PASSWORD')}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="lok-field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('New password (min. 8 characters)')} style={pwField} />
        <input className="lok-field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t('Repeat new password')} style={pwField} />
        <button
          onClick={savePw}
          disabled={pwState !== 'idle'}
          className="lok-btn"
          style={{ flex: 'none', border: 'none', background: pwState === 'done' ? '#3DBB6E' : 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '12px 20px', borderRadius: 0, cursor: pwState === 'idle' ? 'pointer' : 'default', transition: 'background .2s ease' }}
        >
          {pwState === 'saving' ? t('Saving…') : pwState === 'done' ? t('Password changed ✓') : t('Change password')}
        </button>
      </div>
      {pwErr && <div style={{ fontSize: 12, color: '#B23A1B', fontWeight: 600, marginTop: 8 }}>{pwErr}</div>}
      <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 500, marginTop: 10, lineHeight: 1.5 }}>
        {t('Signed in with Google? Setting a password here also lets you log in with your email.')}
      </div>
    </div>
  )
}

export default function ProfileView() {
  const { state, openEdit, pickPhoto, logout, openSell, openItem, refetchProfile } = useM()
  const { t } = useLang()
  const isPhone = useIsPhone()
  // "Get verified": upload a student ID from the profile (was in onboarding)
  const idFileRef = useRef<HTMLInputElement>(null)
  const [idUploading, setIdUploading] = useState(false)
  const onIdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || idUploading) return
    setIdUploading(true)
    try {
      await uploadVerificationDoc(file)
      refetchProfile() // auto-verify trigger grants the badge
    } catch (err) {
      alert(t('Upload failed:') + ' ' + (err instanceof Error ? err.message : t('unknown error')))
    } finally {
      setIdUploading(false)
    }
  }
  const s = state
  const p = s.profile
  const profileInitial = (p.name || '?').trim().charAt(0).toUpperCase()

  const [listings, setListings] = useState<DbListing[] | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)
  const [wishlist, setWishlist] = useState<DbListing[] | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([fetchMyListings(), fetchReviewsAboutMe(), fetchMyWishlist()])
      .then(([l, r, w]) => {
        if (!active) return
        setListings(l)
        setReviews(r)
        setWishlist(w)
      })
      .catch(() => {
        if (!active) return
        setListings([])
        setReviews([])
        setWishlist([])
      })
    return () => {
      active = false
    }
  }, [])

  // ---------- loading / error gates ----------
  if (s.profileLoading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="lok-spin" style={{ width: 26, height: 26, border: '3px solid #D8D8D4', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
      </div>
    )
  }
  if (s.profileError) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', background: '#FBEEE9', border: '1px solid #E4C4B8', borderRadius: 0, padding: 28, color: '#B23A1B', fontWeight: 600 }}>
        {t("Couldn't load your profile:")} {s.profileError}
      </div>
    )
  }

  const stats = s.stats
  const ratingLabel = stats && stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'
  const isTopSeller = !!stats && stats.sold >= 5 && stats.avgRating != null && stats.avgRating >= 4.5
  const statTiles = [
    { value: String(stats?.selling ?? 0), label: t('Selling'), color: 'var(--accent,#000000)' },
    { value: String(stats?.sold ?? 0), label: t('Sold'), color: '#1E9E5A' },
    { value: String(stats?.buying ?? 0), label: t('Buying'), color: '#000000' },
    { value: ratingLabel, label: `${stats?.reviewCount ?? 0} ${t('reviews')}`, color: '#000000' },
  ]
  const activeListings = (listings || []).filter((l) => l.status === 'active')
  const soldListings = (listings || []).filter((l) => l.status === 'sold')
  const avatarUrl = s.photo || p.profile_photo_url || null

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 940, margin: '0 auto' }}>
      {/* identity — phones stack (avatar + edit button on top, text full-width
          below) so the name never runs underneath the button */}
      <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: isPhone ? '20px 18px' : '26px 28px', display: 'flex', flexWrap: 'wrap', gap: isPhone ? 16 : 24, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={{ width: 96, height: 96, borderRadius: 0, background: 'var(--accent,#000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F7F3EA', fontWeight: 800, fontSize: 38, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileInitial}
          </div>
          <button onClick={pickPhoto} className="lok-btn" title={t('Change photo')} disabled={s.photoUploading} style={{ position: 'absolute', bottom: -7, right: -7, width: 34, height: 34, borderRadius: 0, border: '2.5px solid #FFFFFF', background: '#000000', color: '#F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {s.photoUploading ? <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid rgba(247,243,234,.4)', borderTopColor: '#F7F3EA', borderRadius: '50%', display: 'inline-block' }} /> : <Camera />}
          </button>
        </div>
        {isPhone && (
          <button onClick={openEdit} className="lok-btn" style={{ marginLeft: 'auto', flex: 'none', border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 16px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Edit /> {t('Edit profile')}
          </button>
        )}
        <div style={{ flex: isPhone ? '1 1 100%' : 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: isPhone ? 23 : 28, fontWeight: 800, letterSpacing: '-.02em', margin: 0, overflowWrap: 'anywhere' }}>{p.name || t('Your name')}</h1>
            <VerifyBadge status={p.verification_status} />
            {isTopSeller && <TopSellerChip />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isPhone ? 16 : 26, marginTop: 16 }}>
            {metaField(t('STUDENT ID'), p.studentId)}
            {metaField(t('WHATSAPP'), p.whatsapp)}
            {metaField(t('DORM & ROOM'), p.building ? `${p.building}${p.room ? ' · ' + p.room : ''}` : '')}
            {metaField(t('MEMBER SINCE'), p.since)}
            {metaField(t('BATCH / YEAR'), p.batch)}
            {metaField(t('CLASS STANDING'), p.standing)}
            {metaField(t('MAJOR'), p.major ? t(p.major) : '')}
          </div>
        </div>
        {!isPhone && (
          <button onClick={openEdit} className="lok-btn" style={{ flex: 'none', border: '1px solid #C9C9C5', background: '#F5F5F3', color: '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 16px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Edit /> {t('Edit profile')}
          </button>
        )}
      </div>

      {/* verification banner */}
      <div style={{ background: 'var(--accent,#000000)', borderRadius: 0, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: 40, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ width: 42, height: 42, borderRadius: 0, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flex: 'none' }}>
          <ShieldCheck size={22} />
        </div>
        <div style={{ flex: 1, color: '#EAF3EE', position: 'relative' }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#fff' }}>
            {p.verification_status === 'verified' ? t('Identity confirmed by campus records') : t('Get your Dorm-Verified badge')}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2, color: '#C6DDD2' }}>
            {p.verification_status === 'verified'
              ? `${t('Verified student')}${p.building ? ' · ' + t('resident of') + ' ' + p.building : ''} · ${t('trades protected by in-app escrow.')}`
              : t('Upload a photo of your student ID to earn the ✔ badge neighbours trust.')}
          </div>
        </div>
        {p.verification_status !== 'verified' && (
          <>
            <input ref={idFileRef} type="file" accept="image/*" onChange={onIdFile} style={{ display: 'none' }} />
            <button
              onClick={() => idFileRef.current?.click()}
              disabled={idUploading}
              className="lok-btn"
              style={{ flex: 'none', position: 'relative', border: 'none', background: '#FFFFFF', color: 'var(--accent,#000000)', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '11px 16px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {idUploading ? (
                <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid #C9D6E8', borderTopColor: 'var(--accent,#000000)', borderRadius: '50%', display: 'inline-block' }} />
              ) : (
                t('Upload student ID')
              )}
            </button>
          </>
        )}
      </div>

      {/* rating summary */}
      <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '20px 22px', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em', marginBottom: 8 }}>{t('RATING')}</div>
        {stats && stats.reviewCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 36, fontWeight: 800, lineHeight: 1, color: '#000000' }}>{ratingLabel}</div>
            <div style={{ fontSize: 16, color: '#E7A81E', letterSpacing: 2 }}>{'★'.repeat(Math.round(stats.avgRating || 0))}{'☆'.repeat(5 - Math.round(stats.avgRating || 0))}</div>
            <div style={{ fontSize: 12.5, color: '#5F6063', fontWeight: 600 }}>{t('from')} {stats.reviewCount} {stats.reviewCount > 1 ? t('reviews') : t('review')}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: '#8B8B86', fontWeight: 600 }}>{t('No ratings yet — your reviews will appear here after your first completed trade.')}</div>
        )}
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 28 }}>
        {statTiles.map((st) => (
          <div key={st.label} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.value}</div>
            <div style={{ fontSize: 11.5, color: '#8B8B86', fontWeight: 600, marginTop: 5 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* wishlist */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={sectionH2}>{t('Wishlist')}</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94' }}>{t('SAVED FOR LATER')}</span>
      </div>
      {wishlist && wishlist.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          {wishlist.map((it) => (
            <SmallCard key={it.id} title={it.title} price={rupiah(it.price)} badge={t('SAVED')} badgeBg="#E8F2F7" badgeFg="#2F6B85" photoUrl={it.photoUrl} onClick={() => openItem(dbListingToItem(it))} />
          ))}
        </div>
      ) : (
        <div style={emptyBox}>{t('Tap the ♡ on any listing to save it here for later.')}</div>
      )}

      {/* my listings */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={sectionH2}>{t('My listings')}</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94' }}>{activeListings.length} {t('ACTIVE')} · {soldListings.length} {t('SOLD')}</span>
      </div>
      {listings && listings.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          {activeListings.map((it) => (
            <SmallCard key={it.id} title={it.title} price={rupiah(it.price)} badge={t('ACTIVE')} badgeBg="#E7F1EA" badgeFg="#1E9E5A" photoUrl={it.photoUrl} onClick={() => openItem(dbListingToItem(it))} />
          ))}
          {soldListings.map((it) => (
            <SmallCard key={it.id} title={it.title} price={rupiah(it.price)} badge={t('SOLD')} badgeBg="#EFE7D9" badgeFg="#9A8A5E" photoUrl={it.photoUrl} dim />
          ))}
        </div>
      ) : (
        <div style={{ ...emptyBox, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div>{t('You have no listings yet.')}</div>
          <button onClick={openSell} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#000000)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 18px', borderRadius: 0, cursor: 'pointer' }}>{t('Post your first item')}</button>
        </div>
      )}

      {/* reviews */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h2 style={sectionH2}>{t('Reviews')}</h2>
        {stats && stats.reviewCount > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94' }}>{stats.reviewCount} {t('TOTAL')}</span>}
      </div>
      {reviews && reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#ECECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#1E1E1E', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.reviewer_name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.reviewer_name}</div>
                  <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94', marginTop: 2 }}>{timeAgo(r.created_at)}</div>
                </div>
                <div style={{ fontSize: 14, color: '#E7A81E', letterSpacing: 1, flex: 'none' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              {r.comment && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#4A4B4E', margin: 0 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyBox}>{t('No reviews yet. After a completed trade, buyers and sellers can rate each other here.')}</div>
      )}

      {/* account & privacy */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '32px 0 14px' }}>
        <h2 style={sectionH2}>{t('Account & privacy')}</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#9A9A94' }}>{t('YOUR DATA, YOUR RULES')}</span>
      </div>
      <AccountPrivacyCard />

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #D8D8D4', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button onClick={logout} className="lok-btn" style={{ border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '12px 26px', borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logout /> {t('Log out')}
        </button>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', letterSpacing: '.06em' }}>
          <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#8B8B86' }}>{t('TERMS')}</a>
          {' · '}
          <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: '#8B8B86' }}>{t('PRIVACY')}</a>
          {' · LOKITA'}
        </div>
      </div>
    </div>
  )
}

// Minimal adapter so tapping a real listing can reuse the existing detail modal
// (full listing→card mapping lands in the Listings phase).
import type { Item } from '../types'
function dbListingToItem(l: DbListing): Item {
  return {
    id: l.id,
    title: l.title,
    price: rupiah(l.price),
    priceNum: l.price,
    dorm: l.building || '',
    building: l.building || '',
    distance: '',
    cond: (l.condition as Item['cond']) || 'Good',
    cat: l.category || 'Others',
    seller: '',
    sellerInitial: '?',
    photo: l.title,
    tone: 'sand',
    tag: '',
    order: 0,
    desc: l.description || '',
    photoUrl: l.photoUrl,
    ownerId: l.seller_id,
    mine: true,
  }
}
