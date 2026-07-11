import { useEffect, useRef, useState } from 'react'
import { useM } from './context'
import { fetchMyListings, fetchReviewsAboutMe, fetchMyWishlist, type DbListing, type ReviewRow } from '../lib/api'
import { uploadVerificationDoc, updatePassword } from '../lib/auth'
import { Camera, Edit, Logout, ShieldCheck, Verified } from '../components/Icons'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const metaField = (label: string, value: string) => (
  <div>
    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#201E18' }}>{value || '—'}</div>
  </div>
)

// verification badge styled by status
function VerifyBadge({ status }: { status?: string }) {
  if (status === 'verified') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#12503A', background: '#EAF1EC', border: '1px solid #CFE2D7', padding: '6px 11px', borderRadius: 9 }}>
        <Verified size={14} checkColor="#EAF1EC" /> Dorm-Verified Student
      </span>
    )
  }
  if (status === 'rejected') {
    return <span style={{ fontSize: 12, fontWeight: 800, color: '#B23A1B', background: '#FBEEE9', border: '1px solid #E4C4B8', padding: '6px 11px', borderRadius: 9 }}>Verification rejected</span>
  }
  return <span style={{ fontSize: 12, fontWeight: 800, color: '#9A6A12', background: '#FBF2DD', border: '1px solid #ECD8A6', padding: '6px 11px', borderRadius: 9 }}>Verification pending</span>
}

function SmallCard({ title, price, badge, badgeBg, badgeFg, dim, photoUrl, onClick }: { title: string; price: string; badge: string; badgeBg: string; badgeFg: string; dim?: boolean; photoUrl?: string | null; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="lok-card" style={{ cursor: onClick ? 'pointer' : 'default', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, overflow: 'hidden', opacity: dim ? 0.62 : 1 }}>
      <div style={{ position: 'relative', height: 100, background: '#EEE7D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {photoUrl ? (
          <img src={photoUrl} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#C9BFA8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-4-4-9 8" /></svg>
        )}
        <span style={{ position: 'absolute', top: 9, left: 9, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: badgeFg, background: badgeBg, padding: '3px 7px', borderRadius: 6, letterSpacing: '.04em' }}>{badge}</span>
      </div>
      <div style={{ padding: '11px 13px 13px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 15, color: '#201E18', marginTop: 3 }}>{price}</div>
      </div>
    </div>
  )
}

const sectionH2: React.CSSProperties = { fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }
const emptyBox: React.CSSProperties = { background: '#FBF8F1', border: '1px dashed #D8CFBB', borderRadius: 18, padding: 28, textAlign: 'center', marginBottom: 32, color: '#8A8578', fontSize: 13.5 }

// Change password + a plain-language privacy summary. Google-only accounts can
// set a password here too (adds email login alongside Google).
function AccountPrivacyCard() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [pwErr, setPwErr] = useState<string | null>(null)

  const savePw = async () => {
    if (pwState !== 'idle') return
    setPwErr(null)
    if (pw.length < 8) return setPwErr('Password must be at least 8 characters.')
    if (pw !== pw2) return setPwErr("The two passwords don't match.")
    setPwState('saving')
    try {
      await updatePassword(pw)
      setPwState('done')
      setPw('')
      setPw2('')
      setTimeout(() => setPwState('idle'), 2500)
    } catch (e) {
      setPwState('idle')
      setPwErr(e instanceof Error ? e.message : 'Could not change the password.')
    }
  }

  const pwField: React.CSSProperties = { flex: '1 1 180px', background: '#F4EFE5', border: '1.5px solid #E4DDCE', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', fontWeight: 500, color: '#201E18' }

  return (
    <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '20px 22px', marginBottom: 32 }}>
      {/* what's visible to whom — plain language */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px', background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 14, padding: '13px 15px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 7 }}>👁️ OTHER MEMBERS SEE</div>
          <div style={{ fontSize: 12.5, color: '#5A5648', lineHeight: 1.7, fontWeight: 500 }}>your name & photo · building + floor · batch & standing · rating, reviews & listings</div>
        </div>
        <div style={{ flex: '1 1 260px', background: '#EAF1EC', border: '1px solid #CFE2D7', borderRadius: 14, padding: '13px 15px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#4A8067', letterSpacing: '.06em', marginBottom: 7 }}>🔒 ONLY YOU SEE</div>
          <div style={{ fontSize: 12.5, color: '#3E4F45', lineHeight: 1.7, fontWeight: 500 }}>WhatsApp number · student ID · email · room number — never shown to other members. All contact happens in-app.</div>
        </div>
      </div>

      {/* change password */}
      <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 9 }}>CHANGE PASSWORD</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="lok-field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min. 8 characters)" style={pwField} />
        <input className="lok-field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repeat new password" style={pwField} />
        <button
          onClick={savePw}
          disabled={pwState !== 'idle'}
          className="lok-btn"
          style={{ flex: 'none', border: 'none', background: pwState === 'done' ? '#3DBB6E' : 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '12px 20px', borderRadius: 12, cursor: pwState === 'idle' ? 'pointer' : 'default', transition: 'background .2s ease' }}
        >
          {pwState === 'saving' ? 'Saving…' : pwState === 'done' ? 'Password changed ✓' : 'Change password'}
        </button>
      </div>
      {pwErr && <div style={{ fontSize: 12, color: '#B23A1B', fontWeight: 600, marginTop: 8 }}>{pwErr}</div>}
      <div style={{ fontSize: 11.5, color: '#8A8578', fontWeight: 500, marginTop: 10, lineHeight: 1.5 }}>
        Signed in with Google? Setting a password here also lets you log in with your email.
      </div>
    </div>
  )
}

export default function ProfileView() {
  const { state, openEdit, pickPhoto, logout, openSell, openItem, refetchProfile } = useM()
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
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'unknown error'))
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
        <span className="lok-spin" style={{ width: 26, height: 26, border: '3px solid #DAD1BF', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
      </div>
    )
  }
  if (s.profileError) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', background: '#FBEEE9', border: '1px solid #E4C4B8', borderRadius: 18, padding: 28, color: '#B23A1B', fontWeight: 600 }}>
        Couldn't load your profile: {s.profileError}
      </div>
    )
  }

  const stats = s.stats
  const ratingLabel = stats && stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'
  const statTiles = [
    { value: String(stats?.selling ?? 0), label: 'Selling', color: 'var(--accent,#2A5FA8)' },
    { value: String(stats?.sold ?? 0), label: 'Sold', color: '#1B7A4B' },
    { value: String(stats?.buying ?? 0), label: 'Buying', color: '#201E18' },
    { value: ratingLabel, label: `${stats?.reviewCount ?? 0} reviews`, color: '#201E18' },
  ]
  const activeListings = (listings || []).filter((l) => l.status === 'active')
  const soldListings = (listings || []).filter((l) => l.status === 'sold')
  const avatarUrl = s.photo || p.profile_photo_url || null

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 940, margin: '0 auto' }}>
      {/* identity */}
      <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 24, padding: '26px 28px', display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={{ width: 96, height: 96, borderRadius: 26, background: 'var(--accent,#2A5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F7F3EA', fontWeight: 800, fontSize: 38, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileInitial}
          </div>
          <button onClick={pickPhoto} className="lok-btn" title="Change photo" disabled={s.photoUploading} style={{ position: 'absolute', bottom: -7, right: -7, width: 34, height: 34, borderRadius: 11, border: '2.5px solid #FBF8F1', background: '#201E18', color: '#F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {s.photoUploading ? <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid rgba(247,243,234,.4)', borderTopColor: '#F7F3EA', borderRadius: '50%', display: 'inline-block' }} /> : <Camera />}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>{p.name || 'Your name'}</h1>
            <VerifyBadge status={p.verification_status} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, marginTop: 16 }}>
            {metaField('STUDENT ID', p.studentId)}
            {metaField('WHATSAPP', p.whatsapp)}
            {metaField('DORM & ROOM', p.building ? `${p.building}${p.room ? ' · ' + p.room : ''}` : '')}
            {metaField('MEMBER SINCE', p.since)}
            {metaField('BATCH / YEAR', p.batch)}
            {metaField('CLASS STANDING', p.standing)}
          </div>
        </div>
        <button onClick={openEdit} className="lok-btn" style={{ flex: 'none', border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Edit /> Edit profile
        </button>
      </div>

      {/* verification banner */}
      <div style={{ background: 'var(--accent,#2A5FA8)', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: 40, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flex: 'none' }}>
          <ShieldCheck size={22} />
        </div>
        <div style={{ flex: 1, color: '#EAF3EE', position: 'relative' }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#fff' }}>
            {p.verification_status === 'verified' ? 'Identity confirmed by campus records' : 'Get your Dorm-Verified badge'}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2, color: '#C6DDD2' }}>
            {p.verification_status === 'verified'
              ? `Verified student${p.building ? ' · ' + p.building + ' resident' : ''} · trades protected by in-app escrow.`
              : 'Upload a photo of your student ID to earn the ✔ badge neighbours trust.'}
          </div>
        </div>
        {p.verification_status !== 'verified' && (
          <>
            <input ref={idFileRef} type="file" accept="image/*" onChange={onIdFile} style={{ display: 'none' }} />
            <button
              onClick={() => idFileRef.current?.click()}
              disabled={idUploading}
              className="lok-btn"
              style={{ flex: 'none', position: 'relative', border: 'none', background: '#FBF8F1', color: 'var(--accent,#2A5FA8)', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '11px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {idUploading ? (
                <span className="lok-spin" style={{ width: 14, height: 14, border: '2px solid #C9D6E8', borderTopColor: 'var(--accent,#2A5FA8)', borderRadius: '50%', display: 'inline-block' }} />
              ) : (
                'Upload student ID'
              )}
            </button>
          </>
        )}
      </div>

      {/* rating summary */}
      <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '20px 22px', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 8 }}>RATING</div>
        {stats && stats.reviewCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 36, fontWeight: 800, lineHeight: 1, color: '#201E18' }}>{ratingLabel}</div>
            <div style={{ fontSize: 16, color: '#E7A81E', letterSpacing: 2 }}>{'★'.repeat(Math.round(stats.avgRating || 0))}{'☆'.repeat(5 - Math.round(stats.avgRating || 0))}</div>
            <div style={{ fontSize: 12.5, color: '#6F6A5C', fontWeight: 600 }}>from {stats.reviewCount} review{stats.reviewCount > 1 ? 's' : ''}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: '#8A8578', fontWeight: 600 }}>No ratings yet — your reviews will appear here after your first completed trade.</div>
        )}
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 14, marginBottom: 28 }}>
        {statTiles.map((st) => (
          <div key={st.label} style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 16, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.value}</div>
            <div style={{ fontSize: 11.5, color: '#8A8578', fontWeight: 600, marginTop: 5 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* wishlist */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={sectionH2}>Wishlist</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>SAVED FOR LATER</span>
      </div>
      {wishlist && wishlist.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          {wishlist.map((it) => (
            <SmallCard key={it.id} title={it.title} price={rupiah(it.price)} badge="SAVED" badgeBg="#EAF1EC" badgeFg="#12503A" photoUrl={it.photoUrl} onClick={() => openItem(dbListingToItem(it))} />
          ))}
        </div>
      ) : (
        <div style={emptyBox}>Tap the ♡ on any listing to save it here for later.</div>
      )}

      {/* my listings */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={sectionH2}>My listings</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>{activeListings.length} ACTIVE · {soldListings.length} SOLD</span>
      </div>
      {listings && listings.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          {activeListings.map((it) => (
            <SmallCard key={it.id} title={it.title} price={rupiah(it.price)} badge="ACTIVE" badgeBg="#E7F1EA" badgeFg="#1B7A4B" photoUrl={it.photoUrl} onClick={() => openItem(dbListingToItem(it))} />
          ))}
          {soldListings.map((it) => (
            <SmallCard key={it.id} title={it.title} price={rupiah(it.price)} badge="SOLD" badgeBg="#EFE7D9" badgeFg="#9A8A5E" photoUrl={it.photoUrl} dim />
          ))}
        </div>
      ) : (
        <div style={{ ...emptyBox, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div>You have no listings yet.</div>
          <button onClick={openSell} className="lok-btn" style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 18px', borderRadius: 12, cursor: 'pointer' }}>Post your first item</button>
        </div>
      )}

      {/* reviews */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h2 style={sectionH2}>Reviews</h2>
        {stats && stats.reviewCount > 0 && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>{stats.reviewCount} TOTAL</span>}
      </div>
      {reviews && reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#EAE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.reviewer_name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.reviewer_name}</div>
                  <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', marginTop: 2 }}>{timeAgo(r.created_at)}</div>
                </div>
                <div style={{ fontSize: 14, color: '#E7A81E', letterSpacing: 1, flex: 'none' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              {r.comment && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#5A5648', margin: 0 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyBox}>No reviews yet. After a completed trade, buyers and sellers can rate each other here.</div>
      )}

      {/* account & privacy */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '32px 0 14px' }}>
        <h2 style={sectionH2}>Account & privacy</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>YOUR DATA, YOUR RULES</span>
      </div>
      <AccountPrivacyCard />

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E4DDCE', display: 'flex', justifyContent: 'center' }}>
        <button onClick={logout} className="lok-btn" style={{ border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '12px 26px', borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logout /> Log out
        </button>
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
