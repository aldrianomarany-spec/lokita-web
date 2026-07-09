import { MarketplaceProvider, useM } from './context'
import { ACCENT, ACCENT_DEEP } from '../theme'
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
  const { state, onPhoto } = useM()
  const s = state

  return (
    <div style={rootStyle}>
      <input id="lok-photo-input" type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />

      <TopBar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '26px 32px 40px' }}>
          {s.view === 'browse' && <BrowseView />}
          {s.view === 'messages' && <MessagesView />}
          {s.view === 'notifications' && <NotificationsView />}
          {s.view === 'orders' && <OrdersView />}
          {s.view === 'profile' && <ProfileView />}
        </main>
      </div>

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
