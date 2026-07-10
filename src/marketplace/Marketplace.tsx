import { MarketplaceProvider, useM } from './context'
import { ACCENT, ACCENT_DEEP } from '../theme'
import { useIsPhone } from './useIsMobile'
import { Plus } from '../components/Icons'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BrowseView from './BrowseView'
import RequestsView from './RequestsView'
import PeopleView from './PeopleView'
import MemberProfileView from './MemberProfileView'
import MessagesView from './MessagesView'
import NotificationsView from './NotificationsView'
import ProfileView from './ProfileView'
import OrdersView from './OrdersView'
import DetailModal from './modals/DetailModal'
import SellModal from './modals/SellModal'
import EditProfileModal from './modals/EditProfileModal'
import CheckoutModal from './modals/CheckoutModal'

// brand accent (tweakable). Blue is the shipped default. CSS custom properties
// aren't in React.CSSProperties, so the object is cast.
const rootStyle = {
  '--accent': ACCENT,
  '--accent-deep': ACCENT_DEEP,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: '#F1ECE1',
} as React.CSSProperties

function Shell() {
  const { state, onPhoto, openSell, openNotifTarget, dismissToast } = useM()
  const s = state
  const isPhone = useIsPhone()

  return (
    <div style={rootStyle}>
      <input id="lok-photo-input" type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />

      <TopBar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <main className="lok-main" style={{ flex: 1, overflowY: 'auto', padding: '26px 32px 40px' }}>
          {s.view === 'browse' && <BrowseView />}
          {s.view === 'requests' && <RequestsView />}
          {s.view === 'people' && <PeopleView />}
          {s.view === 'member' && <MemberProfileView />}
          {s.view === 'messages' && <MessagesView />}
          {s.view === 'notifications' && <NotificationsView />}
          {s.view === 'orders' && <OrdersView />}
          {s.view === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* floating Post button on phones (top-bar button is hidden there) */}
      {isPhone && !s.guest && s.view === 'browse' && (
        <button
          onClick={openSell}
          aria-label="Post an item"
          style={{ position: 'fixed', right: 18, bottom: 20, width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--accent,#2A5FA8)', color: '#F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 24px -8px rgba(42,95,168,.7)', zIndex: 45 }}
        >
          <Plus size={24} />
        </button>
      )}

      {/* realtime notification toast — click to open, auto-dismisses */}
      {s.toast && (
        <div
          onClick={() => {
            const n = s.toast!
            dismissToast()
            openNotifTarget(n)
          }}
          style={{ position: 'fixed', top: 82, right: 16, left: isPhone ? 16 : 'auto', maxWidth: 360, zIndex: 120, background: '#201E18', color: '#F7F3EA', borderRadius: 16, padding: '13px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', boxShadow: '0 18px 40px -12px rgba(32,30,24,.5)', animation: 'lok-rise .3s cubic-bezier(.2,.8,.3,1) both' }}
        >
          <span style={{ flex: 'none', fontSize: 18, marginTop: 1 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>{s.toast.title}</div>
            {s.toast.body && <div style={{ fontSize: 12, color: 'rgba(247,243,234,.75)', marginTop: 2, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.toast.body}</div>}
            <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: 'rgba(247,243,234,.5)', marginTop: 4, letterSpacing: '.06em' }}>TAP TO OPEN</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              dismissToast()
            }}
            style={{ flex: 'none', border: 'none', background: 'rgba(247,243,234,.12)', color: '#F7F3EA', width: 24, height: 24, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* modals */}
      {s.sel && <DetailModal />}
      {s.sellOpen && <SellModal />}
      {s.editOpen && <EditProfileModal />}
      {s.checkoutOpen && <CheckoutModal />}
    </div>
  )
}

export default function Marketplace() {
  return (
    <MarketplaceProvider>
      <Shell />
    </MarketplaceProvider>
  )
}
