import { useState } from 'react'
import { useM } from './context'
import { useIsPhone } from './useIsMobile'
import { Search, Plus, Star, MessageBubble, Bell, Verified } from '../components/Icons'
import { BUILDINGS } from '../theme'
import { BRAND_LOGO_URL } from '../brand'

const navBtn: React.CSSProperties = {
  position: 'relative',
  border: '1px solid #E4DDCE',
  width: 42,
  height: 42,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const badge = (n: number) => (
  <span
    style={{
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 17,
      height: 17,
      padding: '0 4px',
      borderRadius: 9,
      background: '#D4562F',
      color: '#fff',
      fontSize: 10,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Spline Sans Mono',monospace",
    }}
  >
    {n}
  </span>
)

const Avatar = ({ photo, initial, size, radius, fontSize }: { photo: string | null; initial: string; size: number; radius: string; fontSize: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: 'var(--accent,#2A5FA8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#F7F3EA',
      fontWeight: 800,
      fontFamily: "'Bricolage Grotesque',sans-serif",
      overflow: 'hidden',
      fontSize,
    }}
  >
    {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
  </div>
)

export default function TopBar() {
  const { state, patch, goHome, goSignup, goLogin, selectBldg, setQuery, clearQuery, openSell, toggleSavedView, openMessages, openNotifs, toggleMenu, openProfile, openOrders, logout } = useM()
  const [bldgOpen, setBldgOpen] = useState(false)
  const s = state
  const isPhone = useIsPhone()
  const guest = s.guest

  const savedCount = Object.keys(s.saved).length
  const unreadCount = s.convs.reduce((sum, c) => sum + c.unread, 0)
  const notifBadge = s.notifs.filter((n) => !n.is_read).length

  const profileInitial = (s.profile.name || '?').trim().charAt(0).toUpperCase()
  const stats = s.stats
  const ratingLabel = stats && stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'

  const msgActive = s.view === 'messages'
  const notifActive = s.view === 'notifications'

  const menuItems = [
    { icon: '🧑', label: 'My profile', act: openProfile },
    { icon: '🧾', label: 'My orders', act: openOrders },
    { icon: '🔔', label: 'Notifications', act: openNotifs },
    { icon: '🚪', label: 'Log out', act: logout },
  ]

  return (
    <header
      style={{
        height: 70,
        flex: 'none',
        background: '#FBF8F1',
        borderBottom: '1px solid #E4DDCE',
        display: 'flex',
        alignItems: 'center',
        gap: isPhone ? 10 : 20,
        padding: isPhone ? '0 12px' : '0 24px',
        zIndex: 40,
      }}
    >
      {/* brand — logo only on phone */}
      <div onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', flex: 'none' }}>
        <div className="lok-locpin" style={{ width: 38, height: 38, borderRadius: 12, background: BRAND_LOGO_URL ? '#FBF8F1' : 'var(--accent,#2A5FA8)', border: BRAND_LOGO_URL ? '1px solid #E4DDCE' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {BRAND_LOGO_URL ? <img src={BRAND_LOGO_URL} alt="LOKITA" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#F1ECE1' }} />}
        </div>
        {!isPhone && (
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', lineHeight: 1 }}>LOKITA</div>
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#8A8578', letterSpacing: '.14em', marginTop: 2 }}>LOKAL · KITA</div>
          </div>
        )}
      </div>

      {/* building filter — the homepage shows only the chosen building's items */}
      {!isPhone && (
        <div style={{ position: 'relative', flex: 'none' }}>
          <button
            className="lok-btn"
            onClick={() => setBldgOpen((v) => !v)}
            title="Filter the marketplace by building"
            style={{ cursor: 'pointer', border: '1px solid #E4DDCE', display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, color: '#201E18', background: '#F4EFE5', padding: '9px 13px', borderRadius: 12 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent,#2A5FA8)' }} />
            {s.bldg === 'All' ? 'All buildings' : s.bldg}
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 500, fontSize: 10, color: '#A29C8B' }}>JIU · CIKARANG ▾</span>
          </button>
          {bldgOpen && (
            <div style={{ position: 'absolute', top: 46, left: 0, width: 230, background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 14, boxShadow: '0 20px 44px -16px rgba(32,30,24,.35)', padding: 8, zIndex: 70, animation: 'lok-pop .16s ease both' }}>
              {['All', ...BUILDINGS].map((b) => {
                const active = s.bldg === b
                return (
                  <button
                    key={b}
                    className="lok-navi"
                    onClick={() => {
                      selectBldg(b)
                      setBldgOpen(false)
                    }}
                    style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 800 : 600, fontSize: 13.5, padding: '9px 11px', borderRadius: 9, background: active ? '#EAF1EC' : 'transparent', color: active ? '#12503A' : '#4A463B', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}
                  >
                    {b === 'All' ? 'All buildings' : b}
                    {b === 'Main Building' && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#A29C8B', fontWeight: 500 }}>JIU STAFF & LECTURERS</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* search */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 560, display: 'flex', alignItems: 'center', gap: isPhone ? 8 : 11, background: '#F4EFE5', border: '1px solid #E4DDCE', borderRadius: 14, padding: isPhone ? '10px 12px' : '11px 16px' }}>
        <span style={{ color: '#A29C8B', display: 'flex', flex: 'none' }}>
          <Search />
        </span>
        <input
          value={s.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isPhone ? 'Search…' : 'Search your dorm — desk, mini fridge, textbooks…'}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#201E18' }}
        />
        {s.query && (
          <span onClick={clearQuery} style={{ cursor: 'pointer', color: '#A29C8B', fontSize: 13, fontWeight: 700 }}>
            ✕
          </span>
        )}
      </div>

      {/* actions — guests get a different, minimal interface */}
      {guest ? (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
          {!isPhone && (
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#A29C8B', letterSpacing: '.08em', marginRight: 4 }}>BROWSING AS GUEST</span>
          )}
          <button className="lok-btn" onClick={goLogin} style={{ border: '1px solid #D8CFBB', background: '#F4EFE5', color: '#201E18', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '10px 15px', borderRadius: 12, cursor: 'pointer' }}>Log in</button>
          <button className="lok-btn" onClick={goSignup} style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '10px 16px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 16px -6px rgba(42,95,168,.6)' }}>Sign up — it's free</button>
        </div>
      ) : (
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isPhone ? 8 : 12, flex: 'none' }}>
        {/* Post: full button on desktop; on phone it's a floating button (see Shell) */}
        {!isPhone && (
          <button
            className="lok-btn"
            onClick={openSell}
            style={{ border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '11px 18px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 16px -6px rgba(27,94,67,.7)', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus />
            Post an item
          </button>
        )}

        {/* Saved: on phone it lives as a chip in the category bar */}
        {!isPhone && (
          <button className="lok-navi" onClick={toggleSavedView} title="Saved" style={{ ...navBtn, background: s.savedOnly ? '#FBF2DD' : '#F4EFE5', color: s.savedOnly ? '#E7A81E' : '#5A5648' }}>
            <Star fill={s.savedOnly ? '#E7A81E' : 'none'} size={20} />
            {savedCount > 0 && badge(savedCount)}
          </button>
        )}

        <button className="lok-navi" onClick={openMessages} title="Messages" style={{ ...navBtn, background: msgActive ? '#EAF1EC' : '#F4EFE5', color: msgActive ? '#12503A' : '#5A5648' }}>
          <MessageBubble />
          {unreadCount > 0 && badge(unreadCount)}
        </button>

        <button className="lok-navi" onClick={openNotifs} title="Notifications" style={{ ...navBtn, background: notifActive ? '#EAF1EC' : '#F4EFE5', color: notifActive ? '#12503A' : '#5A5648' }}>
          <Bell />
          {notifBadge > 0 && badge(notifBadge)}
        </button>

        {/* avatar */}
        <div onClick={toggleMenu} title="Account" style={{ width: 42, height: 42, cursor: 'pointer', position: 'relative', flex: 'none' }}>
          <Avatar photo={s.photo} initial={profileInitial} size={42} radius="50%" fontSize={16} />
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#3DBB6E', border: '2px solid #FBF8F1' }} />
        </div>
      </div>
      )}

      {/* profile dropdown */}
      {!guest && s.menuOpen && (
        <div
          style={{ position: 'absolute', top: 64, right: 22, width: 264, background: '#FBF8F1', border: '1px solid #E4DDCE', borderRadius: 18, boxShadow: '0 24px 50px -18px rgba(32,30,24,.4)', padding: 16, zIndex: 60, animation: 'lok-pop .18s ease both' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 13, borderBottom: '1px solid #EEE7D8' }}>
            <Avatar photo={s.photo} initial={profileInitial} size={46} radius="50%" fontSize={19} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15 }}>
                {s.profile.name || 'You'}
                {s.profile.verification_status === 'verified' && <Verified size={14} />}
              </div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#8A8578', marginTop: 2 }}>
                {s.profile.verification_status === 'verified' ? 'DORM-VERIFIED' : 'VERIFICATION PENDING'} · ⭐ {ratingLabel}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 2px', borderBottom: '1px solid #EEE7D8' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{stats?.selling ?? 0}</div>
              <div style={{ fontSize: 10, color: '#8A8578', fontWeight: 600 }}>Selling</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid #EEE7D8', borderRight: '1px solid #EEE7D8' }}>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{stats?.buying ?? 0}</div>
              <div style={{ fontSize: 10, color: '#8A8578', fontWeight: 600 }}>Buying</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{ratingLabel}</div>
              <div style={{ fontSize: 10, color: '#8A8578', fontWeight: 600 }}>Rating</div>
            </div>
          </div>
          {menuItems.map((m, i) => (
            <div
              key={i}
              className="lok-navi"
              onClick={() => {
                patch({ menuOpen: false })
                m.act()
              }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, fontWeight: 600, fontSize: 13.5, padding: '10px 10px', borderRadius: 10, color: '#3A362C' }}
            >
              {m.icon} {m.label}
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
