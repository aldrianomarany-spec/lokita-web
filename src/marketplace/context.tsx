import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { signOut } from '../lib/auth'
import { ringNotification, systemAlertsGranted } from '../lib/alerts'
import { enablePush, disablePushForThisDevice } from '../lib/push'
import {
  fetchMyProfile,
  updateMyProfile,
  uploadAvatar,
  fetchProfileStats,
  dbToUiProfile,
  uiEditsToDb,
  fetchFeed,
  fetchCategoryCounts,
  createListing,
  deleteListing,
  createOrder,
  createQrisCharge,
  acceptOrder,
  fetchMyOrders,
  markDroppedOff,
  confirmPickup,
  cancelOrder,
  subscribeOrders,
  subscribeListings,
  subscribePresence,
  subscribeMyProfile,
  fetchListingById,
  submitOrderReview,
  fetchWishlistIds,
  addToWishlist,
  removeFromWishlist,
  getUserId,
  fetchConversations,
  fetchMessages,
  getOrCreateConversation,
  getOrCreateRequestConversation,
  sendMessage as apiSendMessage,
  markConversationRead,
  deleteConversation,
  fetchMarketStats,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeMessages,
  subscribeNotifications,
  countOpenReports,
  expireStaleOrders,
  touchLastSeen,
  uploadChatImage,
  fetchMyActiveListings,
  expireFeatured,
  requestBoost,
  cleanupStaleData,
  incrementView,
  fetchMyBlockedIds,
  blockUser,
  unblockUser,
  fetchMyAlerts,
  createSearchAlert,
  deleteSearchAlert,
  fetchMoveoutActive,
  subscribeSettings,
  type SearchAlertRow,
  type ProfileStats,
  type OrderRow,
  type ConversationRow,
  type MessageRow,
  type NotifRow,
} from '../lib/api'
import type { EnrichedItem, Item, Profile } from '../types'
import { protectionFee } from '../theme'

// Payment modes, picked by env — no code changes needed to upgrade:
//  1. VITE_QRIS_IMAGE_URL set          → show the owner's fixed QRIS image
//  2. VITE_PAYMENT_MODE = "midtrans"   → real Midtrans charge via /api/qris/*
//  3. neither (default)                → PROTOTYPE: generate a scannable demo
//     QR per order (encodes order + amount; no real money moves)
// Modes 1 and 3 are manual: the buyer taps "I've completed payment".
export const STATIC_QR_URL = ((import.meta.env.VITE_QRIS_IMAGE_URL as string | undefined) || '').trim()
export const PAYMENT_MODE = ((import.meta.env.VITE_PAYMENT_MODE as string | undefined) || '').trim().toLowerCase()

// blank profile until the real one loads (fresh-install: nothing populated)
const EMPTY_PROFILE: Profile = {
  name: '', studentId: '', whatsapp: '', building: '', room: '',
  floor: '', batch: '', standing: '', major: '', since: '',
  verification_status: 'pending', profile_photo_url: null,
}

export type View = 'browse' | 'requests' | 'people' | 'member' | 'messages' | 'notifications' | 'profile' | 'orders' | 'admin' | 'guide'
export type Sort = 'Nearest' | 'Newest' | 'Price'
export type CoStep = 'options' | 'qris' | 'done' | 'review' | 'reviewdone'
export type ListState = 'idle' | 'saving' | 'done'

export interface SellForm {
  title: string
  price: string
  cat: string
  cond: string
  loc: string
  floor: string
  desc: string
  bundleItems: string // one item per line (graduation bundles)
}

export interface State {
  // read-only guest (no session): browsing allowed, all actions prompt signup
  guest: boolean
  // user ids currently online (Supabase Realtime Presence — no DB storage)
  onlineIds: string[]
  view: View
  cat: string
  cond: string
  bldg: string // homepage building filter: 'All' or a building label
  sort: Sort
  query: string
  sel: Item | null
  sellOpen: boolean
  menuOpen: boolean
  savedOnly: boolean
  freeOnly: boolean // 💝 Free & Donations corner (giveaway listings only)
  blockedIds: string[] // members this user blocked (hidden from feed + chats)
  alerts: SearchAlertRow[] // saved-search alerts ("tell me when … is posted")
  moveout: boolean // 🎓 moving-out season strip (admin toggle, site_settings)
  saved: Record<string, boolean>
  feed: EnrichedItem[]
  feedLoading: boolean
  feedError: string | null
  categoryCounts: Record<string, number>
  orders: OrderRow[]
  ordersLoading: boolean
  ordersError: string | null
  // messages (real)
  convs: ConversationRow[]
  convsLoading: boolean
  activeConvId: string | null
  msgs: MessageRow[]
  msgsLoading: boolean
  msgDraft: string
  // notifications (real)
  notifs: NotifRow[]
  notifsLoading: boolean
  notifFilter: string
  // transient toast for a just-arrived notification (click to open)
  toast: NotifRow | null
  photo: string | null
  editOpen: boolean
  checkoutOpen: boolean
  coStep: CoStep
  pay: 'cod' | 'qris'
  pickup: 'meet' | 'leave' | 'security'
  // opt-in Buyer Protection for the order being checked out (fee from protectionFee())
  protectOn: boolean
  lastOrderId: string | null // order just placed — the done step pays its protection fee
  meetSpot: string // preset campus spot when pickup = meet in person (0032)
  // QRIS payment in progress (QR to display + which order it pays for).
  // manual=true → buyer confirms with a button (static/demo modes);
  // manual=false → Midtrans webhook confirms automatically.
  qris: { orderId: string; qrUrl: string; amount: number; manual: boolean } | null
  qrisLoading: boolean
  // full member-profile page (view 'member')
  memberId: string | null
  memberName: string | null
  memberReturn: View // where "back" goes
  profile: Profile
  pf: Profile
  profileLoading: boolean
  profileError: string | null
  stats: ProfileStats | null
  pfSaving: boolean
  pfError: string | null
  photoUploading: boolean
  listState: ListState
  bundleOn: boolean
  giveawayOn: boolean // 💝 give it away for free (price 0, no fee)
  f: SellForm
  openReports: number // open-report count for the admin sidebar badge
  recents: string[] // recently viewed listing ids, newest first (this device only)
  // product card queued to ride on the next chat message (Shopee-style)
  pendingAttach: { id: string; title: string; price: string; photo: string | null } | null
  marketStats: number | null // completed trades — public trust counter
}

// recently viewed lives in localStorage — no DB weight, wiped with browser data
const RECENTS_KEY = 'lokita_recent'
const readRecents = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

const initialState: State = {
  guest: false,
  onlineIds: [],
  view: 'browse',
  cat: 'All',
  cond: 'All',
  bldg: 'All',
  sort: 'Nearest',
  query: '',
  sel: null,
  sellOpen: false,
  menuOpen: false,
  savedOnly: false,
  freeOnly: false,
  blockedIds: [],
  alerts: [],
  moveout: false,
  saved: {},
  feed: [],
  feedLoading: true,
  feedError: null,
  categoryCounts: {},
  recents: readRecents(),
  pendingAttach: null,
  marketStats: null,
  orders: [],
  ordersLoading: false,
  ordersError: null,
  convs: [],
  convsLoading: false,
  activeConvId: null,
  msgs: [],
  msgsLoading: false,
  msgDraft: '',
  notifs: [],
  notifsLoading: false,
  notifFilter: 'all',
  toast: null,
  photo: null,
  editOpen: false,
  checkoutOpen: false,
  coStep: 'options',
  pay: 'cod',
  pickup: 'security',
  protectOn: false,
  lastOrderId: null,
  meetSpot: 'Security Post area',
  qris: null,
  qrisLoading: false,
  memberId: null,
  memberName: null,
  memberReturn: 'browse',
  profile: { ...EMPTY_PROFILE },
  pf: { ...EMPTY_PROFILE },
  profileLoading: true,
  profileError: null,
  stats: null,
  pfSaving: false,
  pfError: null,
  photoUploading: false,
  listState: 'idle',
  bundleOn: false,
  giveawayOn: false,
  f: { title: '', price: '', cat: 'Furniture', cond: 'Good', loc: 'Thomas Building', floor: '', desc: '', bundleItems: '' },
  openReports: 0,
}

// (proximity now lives in src/lib/api.ts, computed on real DB floor codes)

export interface MarketplaceApi {
  state: State
  patch: (p: Partial<State> | ((prev: State) => Partial<State>)) => void
  enrichedItems: EnrichedItem[]
  // actions
  goSignup: () => void
  goLogin: () => void
  goHome: () => void
  setQuery: (v: string) => void
  clearQuery: () => void
  selectCat: (label: string) => void
  selectCond: (label: string) => void
  selectBldg: (label: string) => void
  openRequests: () => void
  openPeople: () => void
  openAdmin: () => void
  openGuide: () => void
  refreshReports: () => void
  openRequestChat: (requesterId: string, category?: string) => Promise<void>
  selectSort: (k: Sort) => void
  toggleSavedView: () => void
  toggleFreeView: () => void
  toggleSaveItem: (id: string) => void
  blockMember: (id: string) => Promise<void>
  unblockMember: (id: string) => Promise<void>
  addAlert: (query: string) => Promise<void>
  removeAlert: (id: string) => Promise<void>
  openItem: (it: Item) => void
  closeDetail: () => void
  chatSeller: () => void
  openSell: () => void
  closeSell: () => void
  setF: (k: keyof SellForm, v: string) => void
  toggleBundle: () => void
  toggleGiveaway: () => void
  submitListing: (photos: File[]) => void
  reloadFeed: () => void
  deleteMyListing: (id: string) => Promise<void>
  toggleMenu: () => void
  openMessages: () => void
  openConversation: (id: string) => void
  deleteThread: (conv: ConversationRow) => Promise<void>
  cancelAttach: () => void
  sendOffer: (amount: number) => Promise<void> | void
  boostListing: (days: 3 | 7) => Promise<string | null>
  setMsgDraft: (v: string) => void
  sendMsg: (text?: string) => void
  sendImage: (file: File) => Promise<void>
  openNotifs: () => void
  selectNotifFilter: (k: string) => void
  markAllRead: () => void
  openNotifTarget: (n: NotifRow) => void
  dismissToast: () => void
  openListingById: (id: string) => Promise<void>
  openProfile: () => void
  openEdit: () => void
  closeEdit: () => void
  setPf: (k: keyof Profile, v: string) => void
  savePf: () => void
  refetchProfile: () => void
  pickPhoto: () => void
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  openCheckout: () => void
  closeCheckout: () => void
  setPay: (v: 'cod' | 'qris') => void
  setPickup: (v: 'meet' | 'leave' | 'security') => void
  coContinue: () => void
  confirmQrisPaid: () => void
  cancelQrisPayment: () => void
  openOrders: () => void
  acceptMyOrder: (id: string) => Promise<void>
  markOrderDropped: (id: string, photoUrl?: string | null) => Promise<void>
  confirmOrderPickup: (id: string) => Promise<void>
  cancelMyOrder: (id: string) => Promise<void>
  submitReviewFor: (order: OrderRow, rating: number, comment: string) => Promise<void>
  openMember: (id: string | null, name: string | null) => void
  closeMember: () => void
  logout: () => void
  resetFilters: () => void
}

const Ctx = createContext<MarketplaceApi | null>(null)

export function useM(): MarketplaceApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useM must be used within MarketplaceProvider')
  return ctx
}

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<State>(initialState)
  const listTimers = useRef<number[]>([])

  const patch = useCallback(
    (p: Partial<State> | ((prev: State) => Partial<State>)) =>
      setState((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) })),
    [],
  )

  // remember what the user opened (newest first, deduped, capped at 8)
  const recordRecent = useCallback(
    (id: string) => {
      patch((prev) => {
        const next = [id, ...prev.recents.filter((x) => x !== id)].slice(0, 8)
        try {
          localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
        } catch {
          // storage full/blocked — the row just won't persist
        }
        return { recents: next }
      })
    },
    [patch],
  )

  // the 💝 Free & Donations toggle rides every feed fetch via a ref, so the
  // nine existing loadFeed call sites don't each need to thread it through
  const freeOnlyRef = useRef(false)
  useEffect(() => {
    freeOnlyRef.current = state.freeOnly
  }, [state.freeOnly])

  // live feed from Supabase (filters/sort/cap applied server-side)
  const loadFeed = useCallback(
    async (opts: { cat: string; cond: string; sort: Sort; query: string; building: string }, viewerFloor: string | null) => {
      patch({ feedLoading: true, feedError: null })
      try {
        const [feed, counts] = await Promise.all([fetchFeed({ ...opts, free: freeOnlyRef.current }, viewerFloor), fetchCategoryCounts()])
        patch({ feed, categoryCounts: counts, feedLoading: false })
      } catch (e) {
        patch({ feedLoading: false, feedError: e instanceof Error ? e.message : 'Failed to load listings' })
      }
    },
    [patch],
  )

  // re-fetch whenever the filters or the viewer's floor change (query debounced)
  const { cat, cond, sort, query, bldg, freeOnly } = state
  const viewerFloor = state.profile.floor
  useEffect(() => {
    const floorCode = viewerFloor ? viewerFloor.toLowerCase() : null
    const t = window.setTimeout(() => loadFeed({ cat, cond, sort, query, building: bldg }, floorCode), query ? 300 : 0)
    return () => window.clearTimeout(t)
  }, [cat, cond, sort, query, bldg, freeOnly, viewerFloor, loadFeed])

  // Keep the latest feed params in a ref so the realtime callback can reload
  // with the current filters without re-subscribing on every keystroke.
  const feedParamsRef = useRef({ cat, cond, sort, query, bldg, viewerFloor })
  useEffect(() => {
    feedParamsRef.current = { cat, cond, sort, query, bldg, viewerFloor }
  }, [cat, cond, sort, query, bldg, viewerFloor])

  // Realtime feed: when any listing changes (new post, price drop, sold), reload
  // so the browse grid updates live — no manual refresh.
  useEffect(() => {
    const unsub = subscribeListings(() => {
      const p = feedParamsRef.current
      loadFeed({ cat: p.cat, cond: p.cond, sort: p.sort, query: p.query, building: p.bldg }, p.viewerFloor ? p.viewerFloor.toLowerCase() : null)
      // a sale flips a listing to sold — refresh the public trust counter too
      fetchMarketStats().then((m) => m && patch({ marketStats: m.completed_trades }))
    })
    fetchMarketStats().then((m) => m && patch({ marketStats: m.completed_trades }))
    return () => unsub()
  }, [loadFeed, patch])

  // Deep link: /app?item=<id> (a shared listing link) opens that item on
  // arrival. The param is stripped right away so refresh/back doesn't re-open
  // the modal, and a dead link (sold + cleaned up) just lands on the homepage.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('item')
    const member = params.get('member')
    if (!id && !member) return
    window.history.replaceState({}, '', window.location.pathname)
    if (id) {
      fetchListingById(id, null)
        .then((it) => {
          if (it) {
            recordRecent(id)
            patch({ sel: it })
          }
        })
        .catch(() => {})
    } else if (member) {
      // shared storefront link — the member view fetches the profile itself
      patch({ view: 'member', memberId: member, memberName: null, memberReturn: 'browse' })
    }
  }, [patch, recordRecent])

  // blocked members disappear from the feed and the inbox
  const enrichedItems = state.blockedIds.length
    ? state.feed.filter((i) => !i.ownerId || !state.blockedIds.includes(i.ownerId))
    : state.feed

  // Load the signed-in user's real profile + stats (fresh-install: blank until set).
  // No session → guest mode: browsing works, all actions prompt signup.
  const loadProfile = useCallback(async () => {
    patch({ profileLoading: true, profileError: null })
    try {
      const db = await fetchMyProfile()
      if (!db) {
        patch({ guest: true, profileLoading: false, profileError: null })
        return
      }
      const ui = dbToUiProfile(db)
      const stats = await fetchProfileStats(db.id)
      patch({ guest: false, profile: ui, pf: ui, photo: ui.profile_photo_url || null, stats, profileLoading: false })
    } catch (e) {
      patch({ profileLoading: false, profileError: e instanceof Error ? e.message : 'Failed to load profile' })
    }
  }, [patch])

  // Hydrate the ♡ save map from the wishlist table so saves survive refresh.
  const loadWishlist = useCallback(async () => {
    try {
      const ids = await fetchWishlistIds()
      const map: Record<string, boolean> = {}
      for (const id of ids) map[id] = true
      patch({ saved: map })
    } catch {
      /* keep whatever's in memory */
    }
  }, [patch])

  // orders (transactions) — my purchases & sales, with realtime updates
  const loadOrders = useCallback(async () => {
    patch({ ordersLoading: true, ordersError: null })
    try {
      const orders = await fetchMyOrders()
      patch({ orders, ordersLoading: false })
    } catch (e) {
      patch({ ordersLoading: false, ordersError: e instanceof Error ? e.message : 'Failed to load orders' })
    }
  }, [patch])

  useEffect(() => {
    let unsub: (() => void) | undefined
    getUserId().then((uid) => {
      if (!uid) return
      // sweep overdue orders first (pending >48h / missed drop-off) so
      // reserved items free up, then load the fresh list; also let the DB
      // tidy stale wishlist rows + old notifications (fire-and-forget)
      cleanupStaleData().catch(() => {})
      expireFeatured().catch(() => {})
      touchLastSeen()
      // self-healing push: members who granted notification permission before
      // Web Push existed never ran the subscribe step (the enable button hides
      // once permission is granted) — register this device on every login
      if (systemAlertsGranted()) enablePush()
      expireStaleOrders()
        .catch(() => {})
        .finally(() => loadOrders())
      // refresh both the orders list AND profile stats — so a seller's "Sold"
      // (and either party's "Buying") tick up live when the counterparty acts.
      unsub = subscribeOrders(uid, () => {
        loadOrders()
        loadProfile()
      })
    })
    return () => unsub?.()
  }, [loadOrders, loadProfile])

  // ---- own profile realtime: details/badge changes reflect instantly ----
  useEffect(() => {
    let unsub: (() => void) | undefined
    getUserId().then((uid) => {
      if (!uid) return
      unsub = subscribeMyProfile(uid, () => loadProfile())
    })
    return () => unsub?.()
  }, [loadProfile])

  // ---- admin badge: open-report count (RLS returns 0 rows for non-admins) ----
  const loadReportsCount = useCallback(async () => {
    patch({ openReports: await countOpenReports() })
  }, [patch])
  const isAdminRole = state.profile.role === 'admin'
  useEffect(() => {
    if (isAdminRole) loadReportsCount()
  }, [isAdminRole, loadReportsCount])

  // ---- online presence (members only; guests neither track nor see it) ----
  useEffect(() => {
    let unsub: (() => void) | undefined
    getUserId().then((uid) => {
      if (!uid) return
      unsub = subscribePresence(uid, (ids) => patch({ onlineIds: ids }))
    })
    return () => unsub?.()
  }, [patch])

  // ---- messages + notifications (real, realtime) ----
  // latest grouped conversations, readable from callbacks without re-subscribing
  const convsRef = useRef<ConversationRow[]>([])
  const blockedRef = useRef<string[]>([])
  useEffect(() => {
    blockedRef.current = state.blockedIds
  }, [state.blockedIds])
  const loadConversations = useCallback(async () => {
    patch({ convsLoading: true })
    try {
      const all = await fetchConversations()
      const convs = blockedRef.current.length ? all.filter((c) => !blockedRef.current.includes(c.other_id)) : all
      convsRef.current = convs
      patch({ convs, convsLoading: false })
    } catch {
      patch({ convsLoading: false })
    }
  }, [patch])

  // ---- blocks + saved-search alerts + moveout season (0029) ----
  const loadBlocked = useCallback(async () => {
    const ids = await fetchMyBlockedIds()
    blockedRef.current = ids
    patch({ blockedIds: ids })
  }, [patch])
  const loadAlerts = useCallback(async () => {
    patch({ alerts: await fetchMyAlerts() })
  }, [patch])
  useEffect(() => {
    getUserId().then((uid) => {
      if (!uid) return
      loadBlocked()
      loadAlerts()
    })
    fetchMoveoutActive().then((on) => patch({ moveout: on }))
    // admin flips the season toggle → every homepage updates live
    const unsub = subscribeSettings(() => fetchMoveoutActive().then((on) => patch({ moveout: on })))
    return () => unsub()
  }, [loadBlocked, loadAlerts, patch])

  // resolve a conversation id to its whole one-per-person group
  const groupIdsFor = useCallback((convId: string): string[] => {
    const g = convsRef.current.find((c) => c.id === convId || c.conv_ids.includes(convId))
    return g ? g.conv_ids : [convId]
  }, [])

  const loadMessages = useCallback(async (convId: string) => {
    patch({ msgsLoading: true })
    try {
      patch({ msgs: await fetchMessages(groupIdsFor(convId)), msgsLoading: false })
    } catch {
      patch({ msgsLoading: false })
    }
  }, [patch, groupIdsFor])

  const loadNotifications = useCallback(async () => {
    patch({ notifsLoading: true })
    try {
      patch({ notifs: await fetchNotifications(), notifsLoading: false })
    } catch {
      patch({ notifsLoading: false })
    }
  }, [patch])

  const toastTimer = useRef<number | null>(null)

  // ref so the realtime callback always sees the currently-open thread
  const activeConvRef = useRef<string | null>(null)
  useEffect(() => {
    activeConvRef.current = state.activeConvId
  }, [state.activeConvId])

  useEffect(() => {
    let unsubM: (() => void) | undefined
    let unsubN: (() => void) | undefined
    getUserId().then((uid) => {
      if (!uid) return
      loadConversations()
      loadNotifications()
      unsubM = subscribeMessages(uid, () => {
        loadConversations()
        if (activeConvRef.current) loadMessages(activeConvRef.current)
      })
      unsubN = subscribeNotifications(
        uid,
        () => loadNotifications(),
        (n) => {
          // pop a toast for the fresh notification; auto-dismiss after 5s.
          // Also ring: chime + vibration + system popup (when permitted)
          ringNotification(n.title, n.body)
          patch({ toast: n })
          if (toastTimer.current) window.clearTimeout(toastTimer.current)
          toastTimer.current = window.setTimeout(() => patch({ toast: null }), 5000)
        },
      )
    })
    return () => {
      unsubM?.()
      unsubN?.()
    }
  }, [loadConversations, loadNotifications, loadMessages])

  // "last seen" heartbeat every 4 minutes while the tab is open
  useEffect(() => {
    const t = window.setInterval(() => touchLastSeen(), 240_000)
    return () => window.clearInterval(t)
  }, [])

  const pickupCode = (p: State['pickup']) =>
    p === 'meet' ? 'meet_in_person' : p === 'leave' ? 'trusted_handoff' : 'security_post'

  // place a real order from the checkout; refresh feed/orders/stats.
  // Returns the new order's id, or null on failure.
  const placeOrder = async (): Promise<string | null> => {
    const sel = state.sel
    if (!sel || !sel.ownerId) {
      alert('This listing is no longer available.')
      return null
    }
    try {
      const id = await createOrder({
        listingId: sel.id,
        sellerId: sel.ownerId,
        payment_method: state.pay,
        pickup_method: pickupCode(state.pickup),
        meetup_spot: state.pickup === 'meet' ? state.meetSpot : null,
        protection_enabled: state.protectOn,
        protection_fee: state.protectOn ? protectionFee(sel.priceNum) : 0,
      })
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await Promise.all([
        loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode),
        loadOrders(),
      ])
      loadProfile()
      return id
    } catch (e) {
      alert('Could not place order: ' + (e instanceof Error ? e.message : 'unknown error'))
      return null
    }
  }

  useEffect(() => {
    loadProfile()
    loadWishlist()
  }, [loadProfile, loadWishlist])

  // Guest → send to the auth flow (signup form directly, or plain login).
  const goSignup = () => {
    sessionStorage.removeItem('lokita-guest')
    navigate('/?signup=1')
  }
  const goLogin = () => {
    sessionStorage.removeItem('lokita-guest')
    navigate('/')
  }

  const api: MarketplaceApi = {
    state,
    patch,
    enrichedItems,
    goSignup,
    goLogin,

    goHome: () =>
      patch({ cat: 'All', cond: 'All', query: '', sel: null, savedOnly: false, freeOnly: false, menuOpen: false, view: 'browse' }),
    setQuery: (v) => patch({ query: v, savedOnly: false, freeOnly: false, view: 'browse' }),
    clearQuery: () => patch({ query: '' }),
    selectCat: (label) => patch({ cat: label, savedOnly: false, freeOnly: false, view: 'browse' }),
    selectCond: (label) => patch({ cond: label }),
    selectBldg: (label) => patch({ bldg: label, savedOnly: false, view: 'browse' }),
    openRequests: () => patch({ view: 'requests', menuOpen: false, sel: null }),
    // gate is cosmetic — RLS is the real barrier for every admin query
    openAdmin: () => {
      if (state.guest || state.profile.role !== 'admin') return
      patch({ view: 'admin', menuOpen: false, sel: null })
      loadReportsCount()
    },
    openGuide: () => patch({ view: 'guide', menuOpen: false, sel: null }),
    refreshReports: () => loadReportsCount(),
    openPeople: () => {
      if (state.guest) return goSignup()
      patch({ view: 'people', menuOpen: false, sel: null })
    },
    openRequestChat: async (requesterId, category) => {
      if (state.guest) return goSignup()
      try {
        const cid = await getOrCreateRequestConversation(requesterId)
        // "I have this" — queue the responder's own matching item so it rides
        // on their first message (category match first, else newest listing)
        let attach: State['pendingAttach'] = null
        try {
          const mine = await fetchMyActiveListings()
          const pick = (category && mine.find((l) => (l.category || '').toLowerCase() === category.toLowerCase())) || mine[0]
          if (pick) attach = { id: pick.id, title: pick.title, price: 'Rp ' + Number(pick.price).toLocaleString('id-ID'), photo: pick.photo }
        } catch {
          // no listings — chat opens without an attachment
        }
        patch({ view: 'messages', activeConvId: cid, msgDraft: '', menuOpen: false, sel: null, pendingAttach: attach })
        await Promise.all([loadConversations(), loadMessages(cid)])
      } catch (e) {
        alert('Could not open chat: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },
    selectSort: (k) => patch({ sort: k }),
    toggleSavedView: () =>
      patch((prev) => ({ savedOnly: !prev.savedOnly, freeOnly: false, cat: 'All', query: '', menuOpen: false, view: 'browse' })),
    toggleFreeView: () =>
      patch((prev) => ({ freeOnly: !prev.freeOnly, savedOnly: false, cat: 'All', query: '', menuOpen: false, view: 'browse' })),
    blockMember: async (id) => {
      if (state.guest) return goSignup()
      try {
        await blockUser(id)
        await loadBlocked()
        loadConversations()
      } catch (e) {
        alert('Could not block: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },
    unblockMember: async (id) => {
      try {
        await unblockUser(id)
        await loadBlocked()
        loadConversations()
      } catch (e) {
        alert('Could not unblock: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },
    addAlert: async (q) => {
      if (state.guest) return goSignup()
      await createSearchAlert(q)
      await loadAlerts()
    },
    removeAlert: async (id) => {
      await deleteSearchAlert(id)
      await loadAlerts()
    },
    toggleSaveItem: async (id: string) => {
      if (state.guest) return goSignup()
      const wasSaved = !!state.saved[id]
      // optimistic UI: flip the heart immediately
      patch((prev) => {
        const nx = { ...prev.saved }
        if (wasSaved) delete nx[id]
        else nx[id] = true
        return { saved: nx }
      })
      try {
        if (wasSaved) await removeFromWishlist(id)
        else await addToWishlist(id)
      } catch (e) {
        // revert on failure
        patch((prev) => {
          const nx = { ...prev.saved }
          if (wasSaved) nx[id] = true
          else delete nx[id]
          return { saved: nx }
        })
        alert('Could not update your saved items: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    openItem: (it) => {
      recordRecent(it.id)
      if (!it.mine) incrementView(it.id) // seller sees "N views" (DB skips owners anyway)
      patch({ sel: it, menuOpen: false })
    },
    closeDetail: () => patch({ sel: null }),
    chatSeller: async () => {
      if (state.guest) return goSignup()
      const sel = state.sel
      if (!sel || !sel.ownerId) return
      try {
        const cid = await getOrCreateConversation(sel.id, sel.ownerId)
        // queue the product card — it rides on the next message you send,
        // so the seller always knows which item you're asking about
        patch({
          sel: null,
          view: 'messages',
          activeConvId: cid,
          msgDraft: '',
          menuOpen: false,
          pendingAttach: { id: sel.id, title: sel.title, price: sel.price, photo: sel.photoUrl || null },
        })
        await loadConversations()
        await loadMessages(cid)
      } catch (e) {
        alert('Could not open chat: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    openSell: () => {
      if (state.guest) return goSignup()
      patch({ sellOpen: true, menuOpen: false, sel: null })
    },
    closeSell: () =>
      patch({
        sellOpen: false,
        listState: 'idle',
        bundleOn: false,
        giveawayOn: false,
        f: { title: '', price: '', cat: 'Furniture', cond: 'Good', loc: 'Thomas Building', floor: '', desc: '', bundleItems: '' },
      }),
    reloadFeed: () => {
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode)
    },
    deleteMyListing: async (id) => {
      await deleteListing(id)
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode)
    },
    setF: (k, v) => patch((prev) => ({ f: { ...prev.f, [k]: v } })),
    toggleBundle: () => patch((prev) => ({ bundleOn: !prev.bundleOn })),
    toggleGiveaway: () => patch((prev) => ({ giveawayOn: !prev.giveawayOn })),
    submitListing: async (photos: File[]) => {
      if (state.listState !== 'idle') return
      const f = state.f
      const priceNum = state.giveawayOn ? 0 : Number((f.price || '').replace(/[^0-9]/g, ''))
      if (!f.title.trim()) {
        patch({ feedError: null })
        alert('Please enter an item title.')
        return
      }
      if (!state.giveawayOn && (!priceNum || priceNum <= 0)) {
        alert('Please enter a valid price greater than 0.')
        return
      }
      patch({ listState: 'saving' })
      try {
        await createListing(
          {
            title: f.title.trim(),
            priceNum,
            category: f.cat,
            condition: f.cond,
            building: f.loc,
            floor: f.floor,
            description: f.desc.trim(),
            isBundle: state.bundleOn,
            bundleItems: state.bundleOn
              ? f.bundleItems.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 20)
              : [],
            isGiveaway: state.giveawayOn,
          },
          photos,
        )
        patch({ listState: 'done' })
        // refresh feed + profile stats so the new listing shows immediately
        const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
        await loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode)
        loadProfile()
        listTimers.current.push(window.setTimeout(() => api.closeSell(), 900))
      } catch (e) {
        patch({ listState: 'idle' })
        alert('Could not post your listing: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    toggleMenu: () => patch((prev) => ({ menuOpen: !prev.menuOpen })),

    openMessages: () => {
      if (state.guest) return goSignup()
      patch({ view: 'messages', menuOpen: false, sel: null })
      loadConversations()
    },
    openConversation: (id) => {
      patch({ activeConvId: id, msgDraft: '' })
      loadMessages(id)
      markConversationRead(groupIdsFor(id)).then(() => loadConversations())
    },

    deleteThread: async (conv) => {
      try {
        await deleteConversation(conv.conv_ids)
        if (state.activeConvId && (conv.id === state.activeConvId || conv.conv_ids.includes(state.activeConvId))) {
          patch({ activeConvId: null, msgs: [] })
        }
        await loadConversations()
      } catch (e) {
        alert('Could not delete the chat: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    cancelAttach: () => patch({ pendingAttach: null }),

    boostListing: async (days) => {
      const sel = state.sel
      if (!sel || state.guest) return null
      return await requestBoost(sel.id, days)
    },

    sendOffer: async (amount) => {
      if (state.guest) return goSignup()
      const sel = state.sel
      if (!sel || !sel.ownerId || !(amount > 0)) return
      try {
        const cid = await getOrCreateConversation(sel.id, sel.ownerId)
        await apiSendMessage(cid, `💰 OFFER · Rp ${Math.round(amount).toLocaleString('id-ID')} — ${sel.title}`, sel.id)
        patch({ sel: null, view: 'messages', activeConvId: cid, msgDraft: '', menuOpen: false, pendingAttach: null })
        await loadConversations()
        await loadMessages(cid)
      } catch (e) {
        alert('Could not send the offer: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },
    setMsgDraft: (v) => patch({ msgDraft: v }),
    sendImage: async (file) => {
      const convId = state.activeConvId
      if (!convId || state.guest) return
      const attach = state.pendingAttach
      try {
        const url = await uploadChatImage(file)
        await apiSendMessage(convId, state.msgDraft, attach?.id ?? null, url)
        patch({ msgDraft: '', pendingAttach: null })
        await loadMessages(convId)
        loadConversations()
      } catch (e) {
        alert('Could not send the photo: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    sendMsg: async (text) => {
      const convId = state.activeConvId
      const fromDraft = text == null
      const d = (text ?? state.msgDraft).trim()
      if (!convId || !d) return
      const attach = state.pendingAttach
      if (fromDraft) patch({ msgDraft: '' })
      try {
        await apiSendMessage(convId, d, attach?.id ?? null)
        patch({ pendingAttach: null })
        await loadMessages(convId)
        loadConversations()
      } catch (e) {
        if (fromDraft) patch({ msgDraft: d })
        alert('Could not send: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    openNotifs: () => {
      if (state.guest) return goSignup()
      patch({ view: 'notifications', menuOpen: false, sel: null })
      // seeing the list counts as reading it — clear the bell badge without
      // making the user hunt for a "mark all read" button
      loadNotifications().then(() => {
        markAllNotificationsRead()
          .then(() =>
            patch((prev) => ({ notifs: prev.notifs.map((n) => ({ ...n, is_read: true })) })),
          )
          .catch(() => {})
      })
    },
    selectNotifFilter: (k) => patch({ notifFilter: k }),
    markAllRead: async () => {
      await markAllNotificationsRead()
      loadNotifications()
    },
    dismissToast: () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      patch({ toast: null })
    },
    openListingById: async (id) => {
      try {
        const it = await fetchListingById(id, state.profile.floor ? state.profile.floor.toLowerCase() : null)
        if (it) {
          recordRecent(id)
          patch({ sel: it, menuOpen: false })
        } else alert('This listing is no longer available.')
      } catch {
        alert('Could not open the listing.')
      }
    },
    openNotifTarget: async (n) => {
      markNotificationRead(n.id).catch(() => {})
      if (n.type === 'new_message' && n.reference_id) {
        patch({ view: 'messages', activeConvId: n.reference_id, menuOpen: false, sel: null })
        loadMessages(n.reference_id)
        markConversationRead(groupIdsFor(n.reference_id)).then(() => loadConversations())
      } else if (n.type === 'order_update') {
        patch({ view: 'orders', menuOpen: false, sel: null })
      } else if (n.reference_id) {
        // price drop / item update / search-alert match → open the listing.
        // Not in the current feed (other filters, giveaway section)? Fetch it
        // directly so the tap never dead-ends.
        const inFeed = state.feed.find((x) => x.id === n.reference_id) || null
        if (inFeed) {
          patch({ sel: inFeed, menuOpen: false })
        } else {
          patch({ menuOpen: false })
          api.openListingById(n.reference_id)
        }
      }
      loadNotifications()
    },

    openProfile: () => {
      if (state.guest) return goSignup()
      patch({ view: 'profile', menuOpen: false, sel: null })
    },
    openEdit: () => {
      if (state.guest) return goSignup()
      patch((prev) => ({ editOpen: true, pf: { ...prev.profile }, pfError: null }))
    },
    closeEdit: () => patch({ editOpen: false, pfError: null }),
    setPf: (k, v) => patch((prev) => ({ pf: { ...prev.pf, [k]: v } })),
    savePf: async () => {
      if (state.pfSaving) return
      if (!state.pf.name.trim()) {
        patch({ pfError: 'Name is required.' })
        return
      }
      patch({ pfSaving: true, pfError: null })
      try {
        await updateMyProfile(uiEditsToDb(state.pf))
        await loadProfile() // refetch so the UI reflects the saved values immediately
        patch({ pfSaving: false, editOpen: false })
      } catch (e) {
        patch({ pfSaving: false, pfError: e instanceof Error ? e.message : 'Could not save. Please try again.' })
      }
    },
    refetchProfile: () => {
      loadProfile()
    },
    pickPhoto: () => {
      const el = document.getElementById('lok-photo-input') as HTMLInputElement | null
      el?.click()
    },
    onPhoto: async (e) => {
      const file = e.target.files && e.target.files[0]
      e.target.value = '' // allow re-selecting the same file later
      if (!file) return
      patch({ photoUploading: true, pfError: null })
      try {
        const url = await uploadAvatar(file)
        patch({ photo: url, photoUploading: false })
        await loadProfile()
      } catch (err) {
        patch({ photoUploading: false, pfError: err instanceof Error ? err.message : 'Photo upload failed.' })
      }
    },

    openCheckout: () => {
      patch({ protectOn: false })
      if (state.guest) return goSignup()
      patch({ checkoutOpen: true, coStep: 'options', pay: 'cod', pickup: 'security', qris: null, qrisLoading: false, lastOrderId: null })
    },
    closeCheckout: () => patch({ checkoutOpen: false, coStep: 'options', sel: null, qris: null, qrisLoading: false, lastOrderId: null }),
    setPay: (v) => patch({ pay: v }),
    setPickup: (v) => patch({ pickup: v }),
    coContinue: async () => {
      if (state.pay === 'qris') {
        // place the order first (reserves the listing), then create a REAL
        // Midtrans charge; the webhook + realtime flip it to paid.
        const id = await placeOrder()
        if (!id) return
        patch({ lastOrderId: id }) // the done step collects the protection fee
        const price = state.sel?.priceNum ?? 0
        const amount = price // published price — LOKITA's platform fee is already inside it
        // mode 1: the owner's fixed QRIS image
        if (STATIC_QR_URL) {
          patch({ coStep: 'qris', qrisLoading: false, qris: { orderId: id, qrUrl: STATIC_QR_URL, amount, manual: true } })
          return
        }
        // mode 3 (default): prototype — generate a real, scannable QR that
        // encodes the order details; no gateway, no real money
        if (PAYMENT_MODE !== 'midtrans') {
          try {
            const payload = `LOKITA PROTOTYPE PAYMENT\nOrder: ${id}\nAmount: Rp ${amount.toLocaleString('id-ID')}\nItem: ${state.sel?.title ?? ''}\n(No real money moves — demo only.)`
            const qrUrl = await QRCode.toDataURL(payload, { width: 440, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
            patch({ coStep: 'qris', qrisLoading: false, qris: { orderId: id, qrUrl, amount, manual: true } })
          } catch {
            // QR generation never really fails, but keep the order usable
            patch({ coStep: 'qris', qrisLoading: false, qris: { orderId: id, qrUrl: '', amount, manual: true } })
          }
          return
        }
        // mode 2: real Midtrans charge, webhook confirms automatically
        patch({ coStep: 'qris', qrisLoading: true, qris: null })
        try {
          const q = await createQrisCharge(id)
          patch({ qris: { ...q, manual: false }, qrisLoading: false })
        } catch (e) {
          // roll the order back so the listing frees up, and stay on options
          try {
            await cancelOrder(id)
          } catch {
            /* already cancelled / gone */
          }
          const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
          await Promise.all([loadOrders(), loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode)])
          patch({ coStep: 'options', qrisLoading: false, qris: null })
          alert(e instanceof Error ? e.message : 'Could not start QRIS payment')
        }
        return
      }
      const codOrderId = await placeOrder()
      if (codOrderId) patch({ coStep: 'done', lastOrderId: codOrderId })
    },
    confirmQrisPaid: () => {
      // buyer says they've sent the payment; the ORDER stays "awaiting seller
      // confirmation" until the seller verifies the money and accepts.
      patch({ coStep: 'done' })
      loadOrders()
    },
    cancelQrisPayment: async () => {
      const id = state.qris?.orderId
      patch({ checkoutOpen: false, coStep: 'options', sel: null, qris: null, qrisLoading: false })
      if (!id) return
      try {
        await cancelOrder(id)
      } catch {
        /* may already be paid — leave it */
      }
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await Promise.all([loadOrders(), loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode)])
    },
    openOrders: () => {
      if (state.guest) return goSignup()
      patch({ view: 'orders', menuOpen: false, sel: null, checkoutOpen: false })
    },
    acceptMyOrder: async (id) => {
      await acceptOrder(id)
      await loadOrders()
    },
    markOrderDropped: async (id, photoUrl) => {
      await markDroppedOff(id, photoUrl)
      await loadOrders()
    },
    confirmOrderPickup: async (id) => {
      await confirmPickup(id)
      await Promise.all([loadOrders(), loadProfile()])
    },
    cancelMyOrder: async (id) => {
      await cancelOrder(id)
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await Promise.all([loadOrders(), loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query, building: state.bldg }, floorCode)])
    },
    submitReviewFor: async (order, rating, comment) => {
      await submitOrderReview(order, rating, comment)
      await Promise.all([loadOrders(), loadProfile()])
    },

    openMember: (id, name) => {
      if (state.guest) return goSignup()
      if (!id) return
      patch((prev) => ({ view: 'member', memberId: id, memberName: name, memberReturn: prev.view === 'member' ? prev.memberReturn : prev.view, sel: null, menuOpen: false }))
    },
    closeMember: () => patch((prev) => ({ view: prev.memberReturn, memberId: null, memberName: null })),

    logout: () => {
      disablePushForThisDevice()
      // sign out of Supabase (and leave guest mode), then return to login
      sessionStorage.removeItem('lokita-guest')
      signOut()
        .catch(() => {})
        .finally(() => navigate('/', { replace: true }))
    },
    resetFilters: () => patch({ cat: 'All', cond: 'All', query: '', savedOnly: false, freeOnly: false }),
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
