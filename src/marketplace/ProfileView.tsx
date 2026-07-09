import { useM } from './context'
import { REVIEWS, SOLD_ITEMS } from '../data'
import { T, type Tone } from '../theme'
import type { EnrichedItem } from '../types'
import { Camera, Edit, Logout, ShieldCheck, Verified } from '../components/Icons'

// small striped thumb used by wishlist + my-listings grids
function Thumb({ tone, photo, children }: { tone: Tone; photo: string; children?: React.ReactNode }) {
  const t = T[tone]
  return (
    <div style={{ position: 'relative', height: 118, background: t.tint }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 12px,transparent 12px 24px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: t.label }}>{photo}</span>
      </div>
      {children}
    </div>
  )
}

const metaField = (label: string, value: string) => (
  <div>
    <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9.5, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#201E18' }}>{value}</div>
  </div>
)

export default function ProfileView() {
  const { state, enrichedItems, openItem, openEdit, pickPhoto, logout } = useM()
  const s = state
  const p = s.profile
  const profileInitial = (p.name || 'A').trim().charAt(0).toUpperCase()

  const avatar = (size: number, radius: number, fontSize: number) => (
    <div style={{ width: size, height: size, borderRadius: radius, background: 'var(--accent,#2A5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F7F3EA', fontWeight: 800, fontSize, fontFamily: "'Bricolage Grotesque',sans-serif", overflow: 'hidden' }}>
      {s.photo ? <img src={s.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileInitial}
    </div>
  )

  const stats = [
    { value: '3', label: 'Selling', color: 'var(--accent,#2A5FA8)' },
    { value: '3', label: 'Buying', color: '#201E18' },
    { value: '4.9', label: `${REVIEWS.length} reviews`, color: '#201E18' },
  ]

  const mineActive = enrichedItems.filter((i) => i.mine)
  const wishlist = enrichedItems.filter((i) => s.saved[i.id])

  const mappedReviews = REVIEWS.map((r) => ({
    ...r,
    tint: T[r.tone].tint,
    roleLabel: r.role === 'buyer' ? 'Bought from you' : 'Sold to you',
    starStr: '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars),
  }))

  return (
    <div style={{ animation: 'lok-fade .3s ease both', maxWidth: 940, margin: '0 auto' }}>
      {/* identity */}
      <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 24, padding: '26px 28px', display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          {avatar(96, 26, 38)}
          <button onClick={pickPhoto} className="lok-btn" title="Change photo" style={{ position: 'absolute', bottom: -7, right: -7, width: 34, height: 34, borderRadius: 11, border: '2.5px solid #FBF8F1', background: '#201E18', color: '#F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera />
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>{p.name}</h1>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#12503A', background: '#EAF1EC', border: '1px solid #CFE2D7', padding: '6px 11px', borderRadius: 9 }}>
              <Verified size={14} checkColor="#EAF1EC" />
              Dorm-Verified Student
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, marginTop: 16 }}>
            {metaField('STUDENT ID', p.studentId)}
            {metaField('WHATSAPP', p.whatsapp)}
            {metaField('DORM & ROOM', `${p.building} · ${p.room}`)}
            {metaField('MEMBER SINCE', p.since)}
            {metaField('BATCH / YEAR', p.batch)}
            {metaField('CLASS STANDING', p.standing)}
          </div>
        </div>
        <button onClick={openEdit} className="lok-btn" style={{ flex: 'none', border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '11px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Edit />
          Edit profile
        </button>
      </div>

      {/* verification banner */}
      <div style={{ background: 'var(--accent,#2A5FA8)', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: 40, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flex: 'none' }}>
          <ShieldCheck size={22} />
        </div>
        <div style={{ flex: 1, color: '#EAF3EE', position: 'relative' }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#fff' }}>Identity confirmed by campus records</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 2, color: '#C6DDD2' }}>Verified with student email &amp; ID · {p.building} resident · trades protected by in-app escrow.</div>
        </div>
      </div>

      {/* ratings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 8 }}>SELLER RATING</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 36, fontWeight: 800, lineHeight: 1, color: '#201E18' }}>4.9</div>
            <div style={{ fontSize: 16, color: '#E7A81E', letterSpacing: 2 }}>★★★★★</div>
          </div>
          <div style={{ fontSize: 12.5, color: '#6F6A5C', fontWeight: 600, marginTop: 8 }}>Across 9 rated sales · fast, reliable drop-offs</div>
        </div>
        <div style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.06em', marginBottom: 8 }}>BUYER RATING</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 36, fontWeight: 800, lineHeight: 1, color: '#201E18' }}>5.0</div>
            <div style={{ fontSize: 16, color: '#E7A81E', letterSpacing: 2 }}>★★★★★</div>
          </div>
          <div style={{ fontSize: 12.5, color: '#6F6A5C', fontWeight: 600, marginTop: 8 }}>Across 3 rated purchases · pays &amp; collects on time</div>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map((st) => (
          <div key={st.label} style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 16, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.value}</div>
            <div style={{ fontSize: 11.5, color: '#8A8578', fontWeight: 600, marginTop: 5 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* wishlist */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>Wishlist</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>SAVED FOR LATER</span>
      </div>
      {wishlist.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          {wishlist.map((it: EnrichedItem) => (
            <div key={it.id} onClick={() => openItem(it)} className="lok-card" style={{ cursor: 'pointer', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, overflow: 'hidden' }}>
              <Thumb tone={it.tone} photo={it.photo}>
                <span style={{ position: 'absolute', top: 9, right: 9, width: 26, height: 26, borderRadius: '50%', background: 'rgba(251,248,241,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4562F' }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.2C.2 8.3 1.8 4.7 5.2 4.7c2 0 3.4 1.2 4.2 2.4.8-1.2 2.2-2.4 4.2-2.4 3.4 0 5 3.6 3.2 7.1C19.5 16.4 12 21 12 21z" /></svg>
                </span>
              </Thumb>
              <div style={{ padding: '11px 13px 13px' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 15, color: '#201E18', marginTop: 3 }}>{it.price}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#FBF8F1', border: '1px dashed #D8CFBB', borderRadius: 18, padding: 28, textAlign: 'center', marginBottom: 32, color: '#8A8578', fontSize: 13.5 }}>Tap the ♡ on any listing to save it here for later.</div>
      )}

      {/* my listings */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>My listings</h2>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>3 ACTIVE · 2 SOLD</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
        {mineActive.map((it) => (
          <div key={it.id} onClick={() => openItem(it)} className="lok-card" style={{ cursor: 'pointer', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, overflow: 'hidden', opacity: 1 }}>
            <Thumb tone={it.tone} photo={it.photo}>
              <span style={{ position: 'absolute', top: 9, left: 9, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: '#1B7A4B', background: '#E7F1EA', padding: '3px 7px', borderRadius: 6, letterSpacing: '.04em' }}>ACTIVE</span>
            </Thumb>
            <div style={{ padding: '11px 13px 13px' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 15, color: '#201E18', marginTop: 3 }}>{it.price}</div>
            </div>
          </div>
        ))}
        {SOLD_ITEMS.map((it, i) => (
          <div key={`sold-${i}`} className="lok-card" style={{ cursor: 'default', background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, overflow: 'hidden', opacity: 0.62 }}>
            <Thumb tone={it.tone} photo={it.photo}>
              <span style={{ position: 'absolute', top: 9, left: 9, fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: '#9A8A5E', background: '#EFE7D9', padding: '3px 7px', borderRadius: 6, letterSpacing: '.04em' }}>SOLD</span>
            </Thumb>
            <div style={{ padding: '11px 13px 13px' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 15, color: '#201E18', marginTop: 3 }}>{it.price}</div>
            </div>
          </div>
        ))}
      </div>

      {/* reviews */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>Reviews</h2>
        <span style={{ fontSize: 14, color: '#E7A81E', letterSpacing: 1 }}>★ 4.9</span>
        <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B' }}>FROM 12 TRADES</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mappedReviews.map((r) => (
          <div key={r.id} style={{ background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: r.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3A362C', flex: 'none', fontFamily: "'Bricolage Grotesque',sans-serif" }}>{r.initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.name}</div>
                  <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, fontWeight: 600, color: '#6F6A5C', background: '#F1ECE1', padding: '3px 7px', borderRadius: 5, letterSpacing: '.03em' }}>{r.roleLabel}</span>
                </div>
                <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, color: '#A29C8B', marginTop: 2 }}>{r.item} · {r.ago}</div>
              </div>
              <div style={{ fontSize: 14, color: '#E7A81E', letterSpacing: 1, flex: 'none' }}>{r.starStr}</div>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#5A5648', margin: 0 }}>{r.text}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E4DDCE', display: 'flex', justifyContent: 'center' }}>
        <button onClick={logout} className="lok-btn" style={{ border: '1px solid #E4C4B8', background: '#FBEEE9', color: '#C0492A', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '12px 26px', borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logout />
          Log out
        </button>
      </div>
    </div>
  )
}
