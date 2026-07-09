import { MarketplaceProvider, useM } from './context'
import { ACCENT, ACCENT_DEEP } from '../theme'
import { useIsPhone } from './useIsMobile'
import { Plus } from '../components/Icons'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BrowseView from './BrowseView'
import MessagesView from './MessagesView'
import NotificationsView from './NotificationsView'
import ProfileView from './ProfileView'
import OrdersView from './OrdersView'
import DetailModal from './modals/DetailModal'
import SellModal from './modals/SellModal'
import EditProfileModal from './modals/EditProfileModal'
import CheckoutModal from './modals/CheckoutModal'
import SellerProfileModal from './modals/SellerProfileModal'

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
  const { state, onPhoto, openSell } = useM()
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

      {/* modals */}
      {s.sel && <DetailModal />}
      {s.sellOpen && <SellModal />}
      {s.editOpen && <EditProfileModal />}
      {s.checkoutOpen && <CheckoutModal />}
      {s.sellerOpen && <SellerProfileModal />}
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
