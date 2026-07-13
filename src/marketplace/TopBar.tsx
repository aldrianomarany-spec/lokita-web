import { useState } from 'react'
import { useM } from './context'
import { useIsPhone } from './useIsMobile'
import { Search, MessageBubble, Bell, Verified } from '../components/Icons'
import { BUILDINGS } from '../theme'
import { BRAND_LOGO_URL } from '../brand'
import { useLang, LangToggle } from '../i18n'

const navBtn: React.CSSProperties = {
  position: 'relative',
  border: '1px solid #222222',
  width: 42,
  height: 42,
  borderRadius: 0,
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
      borderRadius: 0,
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
      background: 'var(--accent,#000000)',
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
  const { t } = useLang()
  // Anti-autofill: Chrome's password manager targets this box (the page's main
  // text input) and injects saved emails. readOnly-until-focused blocks all
  // programmatic fills — browsers never autofill readonly inputs.
  const [searchFocused, setSearchFocused] = useState(false)
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
    { icon: '🧑', label: t('My profile'), act: openProfile },
    { icon: '🧾', label: t('My orders'), act: openOrders },
    { icon: '🔔', label: t('Notifications'), act: openNotifs },
    { icon: '🚪', label: t('Log out'), act: logout },
  ]

  return (
    <header
      style={{
        height: 70,
        flex: 'none',
        background: '#000000',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: isPhone ? 10 : 20,
        padding: isPhone ? '0 12px' : '0 24px',
        zIndex: 40,
      }}
    >
      {/* brand — logo mark (when configured) + Grid Market text wordmark */}
      <div onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 'none' }}>
        {BRAND_LOGO_URL && <img src={BRAND_LOGO_URL} alt="LOKITA" style={{ width: isPhone ? 30 : 36, height: isPhone ? 30 : 36, objectFit: 'contain' }} />}
        {!isPhone ? (
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px', color: '#FFFFFF', lineHeight: 1 }}>
            LOKITA<span style={{ color: '#519BB8' }}>.</span>
          </div>
        ) : !BRAND_LOGO_URL ? (
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
            L<span style={{ color: '#519BB8' }}>.</span>
          </div>
        ) : null}
      </div>

      {/* building filter — the homepage shows only the chosen building's items */}
      {!isPhone && (
        <div style={{ position: 'relative', flex: 'none' }}>
          <button
            className="lok-btn"
            onClick={() => setBldgOpen((v) => !v)}
            title={t('Filter the marketplace by building')}
            style={{ cursor: 'pointer', border: '1px solid #222222', display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'inherit', fontWeight: 500, fontSize: 13, color: '#F5F5F3', background: '#141414', padding: '9px 13px', borderRadius: 0 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#519BB8' }} />
            {s.bldg === 'All' ? t('All buildings') : s.bldg}
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontWeight: 500, fontSize: 10, color: '#9A9A94' }}>JIU · CIKARANG ▾</span>
          </button>
          {bldgOpen && (
            <div style={{ position: 'absolute', top: 46, left: 0, width: 230, background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, boxShadow: '0 20px 44px -16px rgba(0,0,0,.35)', padding: 8, zIndex: 70, animation: 'lok-pop .16s ease both' }}>
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
                    style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 800 : 600, fontSize: 13.5, padding: '9px 11px', borderRadius: 0, background: active ? '#E8F2F7' : 'transparent', color: active ? '#2F6B85' : '#3A3B3E', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}
                  >
                    {b === 'All' ? t('All buildings') : b}
                    {b === 'Main Building' && <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#9A9A94', fontWeight: 500 }}>{t('JIU STAFF & LECTURERS')}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* search */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 560, display: 'flex', alignItems: 'center', gap: isPhone ? 8 : 11, background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, padding: isPhone ? '10px 12px' : '10px 14px' }}>
        <span style={{ color: '#9A9A94', display: 'flex', flex: 'none' }}>
          <Search />
        </span>
        <input
          type="search"
          name="lokita-search"
          autoComplete="off"
          readOnly={!searchFocused}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          value={s.query}
          onChange={(e) => {
            // Chrome mistakes this box for a login field and injects the user's
            // email on their first click (autofill fires on unfocused inputs) —
            // which yanked people off "My profile" into a search. Only accept
            // input the user actually typed.
            if (document.activeElement !== e.target) return
            setQuery(e.target.value)
          }}
          placeholder={isPhone ? t('Search…') : t('Search your dorm…')}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#000000' }}
        />
        {s.query && (
          <span onClick={clearQuery} style={{ cursor: 'pointer', color: '#9A9A94', fontSize: 13, fontWeight: 700 }}>
            ✕
          </span>
        )}
      </div>

      {/* language switch — EN | Bahasa Indonesia, remembered on this device */}
      {!isPhone && <LangToggle dark />}

      {/* actions — guests get a different, minimal interface */}
      {guest ? (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
          {!isPhone && (
            <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#8B8B86', letterSpacing: '.08em', marginRight: 4 }}>{t('BROWSING AS GUEST')}</span>
          )}
          <button className="lok-btn" onClick={goLogin} style={{ border: '1px solid #222222', background: '#141414', color: '#F5F5F3', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '10px 15px', borderRadius: 0, cursor: 'pointer' }}>{t('Log in')}</button>
          <button className="lok-btn" onClick={goSignup} style={{ border: 'none', background: '#519BB8', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '10px 16px', borderRadius: 0, cursor: 'pointer' }}>{t("Sign up — it's free")}</button>
        </div>
      ) : (
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isPhone ? 8 : 12, flex: 'none' }}>
        {/* Grid Market top nav: Sell / Saved as text links (like the mock);
            phones keep the tab bar + category-strip equivalents */}
        {!isPhone && (
          <>
            <button className="lok-navi" onClick={openSell} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontWeight: 500, fontSize: 13, color: '#F5F5F3', padding: '8px 4px' }}>
              {t('Sell')}
            </button>
            <button className="lok-navi" onClick={toggleSavedView} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'Archivo',sans-serif", fontWeight: s.savedOnly ? 700 : 500, fontSize: 13, color: s.savedOnly ? '#519BB8' : '#F5F5F3', padding: '8px 4px' }}>
              {t('Saved')}{savedCount > 0 ? ` (${savedCount})` : ''}
            </button>
          </>
        )}

        <button className="lok-navi" onClick={openMessages} title={t('Messages')} style={{ ...navBtn, background: msgActive ? '#519BB8' : '#141414', color: msgActive ? '#FFFFFF' : '#D8D8D4' }}>
          <MessageBubble />
          {unreadCount > 0 && badge(unreadCount)}
        </button>

        <button className="lok-navi" onClick={openNotifs} title={t('Notifications')} style={{ ...navBtn, background: notifActive ? '#519BB8' : '#141414', color: notifActive ? '#FFFFFF' : '#D8D8D4' }}>
          <Bell />
          {notifBadge > 0 && badge(notifBadge)}
        </button>

        {/* avatar */}
        <div onClick={toggleMenu} title={t('Account')} style={{ width: 42, height: 42, cursor: 'pointer', position: 'relative', flex: 'none' }}>
          <Avatar photo={s.photo} initial={profileInitial} size={42} radius="50%" fontSize={16} />
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#3DBB6E', border: '2px solid #FFFFFF' }} />
        </div>
      </div>
      )}

      {/* profile dropdown */}
      {!guest && s.menuOpen && (
        <div
          style={{ position: 'absolute', top: 64, right: 22, width: 264, background: '#FFFFFF', border: '1px solid #D8D8D4', borderRadius: 0, boxShadow: '0 24px 50px -18px rgba(0,0,0,.4)', padding: 16, zIndex: 60, animation: 'lok-pop .18s ease both' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 13, borderBottom: '1px solid #E6E6E3' }}>
            <Avatar photo={s.photo} initial={profileInitial} size={46} radius="50%" fontSize={19} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15 }}>
                {s.profile.name || t('You')}
                {s.profile.verification_status === 'verified' && <Verified size={14} />}
              </div>
              <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#8B8B86', marginTop: 2 }}>
                {s.profile.verification_status === 'verified' ? t('DORM-VERIFIED') : t('VERIFICATION PENDING')} · ⭐ {ratingLabel}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 2px', borderBottom: '1px solid #E6E6E3' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{stats?.selling ?? 0}</div>
              <div style={{ fontSize: 10, color: '#8B8B86', fontWeight: 600 }}>{t('Selling')}</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid #E6E6E3', borderRight: '1px solid #E6E6E3' }}>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{stats?.buying ?? 0}</div>
              <div style={{ fontSize: 10, color: '#8B8B86', fontWeight: 600 }}>{t('Buying')}</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{ratingLabel}</div>
              <div style={{ fontSize: 10, color: '#8B8B86', fontWeight: 600 }}>{t('Rating')}</div>
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
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, fontWeight: 600, fontSize: 13.5, padding: '10px 10px', borderRadius: 0, color: '#1E1E1E' }}
            >
              {m.icon} {m.label}
            </div>
          ))}
          {/* phones have no room in the header — language switch lives here */}
          {isPhone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 2px', borderTop: '1px solid #E6E6E3', marginTop: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5F6063' }}>🌐 {t('Language')}</span>
              <LangToggle />
            </div>
          )}
        </div>
      )}
    </header>
  )
}
