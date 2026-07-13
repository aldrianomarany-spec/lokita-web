import { useM } from './context'
import { Plus } from '../components/Icons'
import { useLang } from '../i18n'

// App-style bottom navigation on phones (members only) — Home · Requests ·
// Sell (raised accent button) · Messages · Profile. Replaces the floating
// Post FAB; the top bar keeps search + notifications.
export default function TabBar() {
  const { state, goHome, openRequests, openSell, openMessages, openProfile } = useM()
  const { t } = useLang()
  const s = state
  const unread = s.convs.reduce((sum, c) => sum + c.unread, 0)

  const item = (label: string, icon: string, active: boolean, onClick: () => void, badge?: number) => (
    <button
      onClick={onClick}
      className="lok-navi"
      style={{ flex: 1, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 0 5px', position: 'relative', color: active ? '#C8A96A' : '#8B8B86' }}
    >
      <span style={{ fontSize: 19, lineHeight: 1, filter: active ? 'none' : 'grayscale(.6)' }}>{icon}</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.02em' }}>{label}</span>
      {!!badge && badge > 0 && (
        <span style={{ position: 'absolute', top: 3, left: '50%', marginLeft: 8, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 0, background: '#D4562F', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Spline Sans Mono',monospace" }}>{badge}</span>
      )}
    </button>
  )

  return (
    <nav
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45, background: '#000000', borderTop: '1px solid #222222', display: 'flex', alignItems: 'flex-end', paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -6px 20px -12px rgba(0,0,0,.25)' }}
    >
      {item(t('Home'), '🏠', s.view === 'browse', goHome)}
      {item(t('Requests'), '🙋', s.view === 'requests', openRequests)}
      {/* raised Sell button */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={openSell}
          aria-label={t('Post an item')}
          className="lok-btn"
          style={{ border: 'none', width: 50, height: 50, borderRadius: '50%', background: '#C8A96A', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -22, boxShadow: '0 0 0 5px #000000' }}
        >
          <Plus size={22} />
        </button>
      </div>
      {item(t('Messages'), '💬', s.view === 'messages', openMessages, unread)}
      {item(t('Profile'), '👤', s.view === 'profile', openProfile)}
    </nav>
  )
}
