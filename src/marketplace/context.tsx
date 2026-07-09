import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'
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
  fetchMyOrders,
  markDroppedOff,
  confirmPickup,
  cancelOrder,
  subscribeOrders,
  subscribeListings,
  submitOrderReview,
  fetchWishlistIds,
  addToWishlist,
  removeFromWishlist,
  getUserId,
  fetchConversations,
  fetchMessages,
  getOrCreateConversation,
  sendMessage as apiSendMessage,
  markConversationRead,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeMessages,
  subscribeNotifications,
  type ProfileStats,
  type OrderRow,
  type ConversationRow,
  type MessageRow,
  type NotifRow,
} from '../lib/api'
import type { EnrichedItem, Item, Profile } from '../types'

// blank profile until the real one loads (fresh-install: nothing populated)
const EMPTY_PROFILE: Profile = {
  name: '', studentId: '', whatsapp: '', building: '', room: '',
  floor: '', batch: '', standing: '', since: '',
  verification_status: 'pending', profile_photo_url: null,
}

export type View = 'browse' | 'messages' | 'notifications' | 'profile' | 'orders'
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
}

export interface State {
  view: View
  cat: string
  cond: string
  sort: Sort
  query: string
  sel: Item | null
  sellOpen: boolean
  menuOpen: boolean
  savedOnly: boolean
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
  photo: string | null
  editOpen: boolean
  checkoutOpen: boolean
  coStep: CoStep
  pay: 'cod' | 'qris'
  pickup: 'meet' | 'leave' | 'security'
  sellerOpen: boolean
  sellerId: string | null
  sellerName: string | null
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
  f: SellForm
}

const initialState: State = {
  view: 'browse',
  cat: 'All',
  cond: 'All',
  sort: 'Nearest',
  query: '',
  sel: null,
  sellOpen: false,
  menuOpen: false,
  savedOnly: false,
  saved: {},
  feed: [],
  feedLoading: true,
  feedError: null,
  categoryCounts: {},
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
  photo: null,
  editOpen: false,
  checkoutOpen: false,
  coStep: 'options',
  pay: 'cod',
  pickup: 'security',
  sellerOpen: false,
  sellerId: null,
  sellerName: null,
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
  f: { title: '', price: '', cat: 'Furniture', cond: 'Good', loc: 'Thomas Building', floor: '', desc: '' },
}

// (proximity now lives in src/lib/api.ts, computed on real DB floor codes)

export interface MarketplaceApi {
  state: State
  patch: (p: Partial<State> | ((prev: State) => Partial<State>)) => void
  enrichedItems: EnrichedItem[]
  // actions
  goHome: () => void
  setQuery: (v: string) => void
  clearQuery: () => void
  selectCat: (label: string) => void
  selectCond: (label: string) => void
  selectSort: (k: Sort) => void
  toggleSavedView: () => void
  toggleSaveItem: (id: string) => void
  openItem: (it: Item) => void
  closeDetail: () => void
  chatSeller: () => void
  openSell: () => void
  closeSell: () => void
  setF: (k: keyof SellForm, v: string) => void
  toggleBundle: () => void
  submitListing: (photos: File[]) => void
  reloadFeed: () => void
  deleteMyListing: (id: string) => Promise<void>
  toggleMenu: () => void
  openMessages: () => void
  openConversation: (id: string) => void
  setMsgDraft: (v: string) => void
  sendMsg: () => void
  openNotifs: () => void
  selectNotifFilter: (k: string) => void
  markAllRead: () => void
  openNotifTarget: (n: NotifRow) => void
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
  coPaid: () => void
  openOrders: () => void
  markOrderDropped: (id: string) => Promise<void>
  confirmOrderPickup: (id: string) => Promise<void>
  cancelMyOrder: (id: string) => Promise<void>
  submitReviewFor: (order: OrderRow, rating: number, comment: string) => Promise<void>
  openSellerProfile: (id: string | null, name: string | null) => void
  closeSellerProfile: () => void
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

  // live feed from Supabase (filters/sort/cap applied server-side)
  const loadFeed = useCallback(
    async (opts: { cat: string; cond: string; sort: Sort; query: string }, viewerFloor: string | null) => {
      patch({ feedLoading: true, feedError: null })
      try {
        const [feed, counts] = await Promise.all([fetchFeed(opts, viewerFloor), fetchCategoryCounts()])
        patch({ feed, categoryCounts: counts, feedLoading: false })
      } catch (e) {
        patch({ feedLoading: false, feedError: e instanceof Error ? e.message : 'Failed to load listings' })
      }
    },
    [patch],
  )

  // re-fetch whenever the filters or the viewer's floor change (query debounced)
  const { cat, cond, sort, query } = state
  const viewerFloor = state.profile.floor
  useEffect(() => {
    const floorCode = viewerFloor ? viewerFloor.toLowerCase() : null
    const t = window.setTimeout(() => loadFeed({ cat, cond, sort, query }, floorCode), query ? 300 : 0)
    return () => window.clearTimeout(t)
  }, [cat, cond, sort, query, viewerFloor, loadFeed])

  // Keep the latest feed params in a ref so the realtime callback can reload
  // with the current filters without re-subscribing on every keystroke.
  const feedParamsRef = useRef({ cat, cond, sort, query, viewerFloor })
  useEffect(() => {
    feedParamsRef.current = { cat, cond, sort, query, viewerFloor }
  }, [cat, cond, sort, query, viewerFloor])

  // Realtime feed: when any listing changes (new post, price drop, sold), reload
  // so the browse grid updates live — no manual refresh.
  useEffect(() => {
    const unsub = subscribeListings(() => {
      const p = feedParamsRef.current
      loadFeed({ cat: p.cat, cond: p.cond, sort: p.sort, query: p.query }, p.viewerFloor ? p.viewerFloor.toLowerCase() : null)
    })
    return () => unsub()
  }, [loadFeed])

  const enrichedItems = state.feed

  // Load the signed-in user's real profile + stats (fresh-install: blank until set).
  const loadProfile = useCallback(async () => {
    patch({ profileLoading: true, profileError: null })
    try {
      const db = await fetchMyProfile()
      if (!db) {
        patch({ profileLoading: false, profileError: 'Not signed in' })
        return
      }
      const ui = dbToUiProfile(db)
      const stats = await fetchProfileStats(db.id)
      patch({ profile: ui, pf: ui, photo: ui.profile_photo_url || null, stats, profileLoading: false })
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
      loadOrders()
      // refresh both the orders list AND profile stats — so a seller's "Sold"
      // (and either party's "Buying") tick up live when the counterparty acts.
      unsub = subscribeOrders(uid, () => {
        loadOrders()
        loadProfile()
      })
    })
    return () => unsub?.()
  }, [loadOrders, loadProfile])

  // ---- messages + notifications (real, realtime) ----
  const loadConversations = useCallback(async () => {
    patch({ convsLoading: true })
    try {
      patch({ convs: await fetchConversations(), convsLoading: false })
    } catch {
      patch({ convsLoading: false })
    }
  }, [patch])

  const loadMessages = useCallback(async (convId: string) => {
    patch({ msgsLoading: true })
    try {
      patch({ msgs: await fetchMessages(convId), msgsLoading: false })
    } catch {
      patch({ msgsLoading: false })
    }
  }, [patch])

  const loadNotifications = useCallback(async () => {
    patch({ notifsLoading: true })
    try {
      patch({ notifs: await fetchNotifications(), notifsLoading: false })
    } catch {
      patch({ notifsLoading: false })
    }
  }, [patch])

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
      unsubN = subscribeNotifications(uid, () => loadNotifications())
    })
    return () => {
      unsubM?.()
      unsubN?.()
    }
  }, [loadConversations, loadNotifications, loadMessages])

  const pickupCode = (p: State['pickup']) =>
    p === 'meet' ? 'meet_in_person' : p === 'leave' ? 'trusted_handoff' : 'security_post'

  // place a real order from the checkout; refresh feed/orders/stats
  const placeOrder = async (): Promise<boolean> => {
    const sel = state.sel
    if (!sel || !sel.ownerId) {
      alert('This listing is no longer available.')
      return false
    }
    try {
      await createOrder({ listingId: sel.id, sellerId: sel.ownerId, payment_method: state.pay, pickup_method: pickupCode(state.pickup) })
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await Promise.all([
        loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query }, floorCode),
        loadOrders(),
      ])
      loadProfile()
      return true
    } catch (e) {
      alert('Could not place order: ' + (e instanceof Error ? e.message : 'unknown error'))
      return false
    }
  }

  useEffect(() => {
    loadProfile()
    loadWishlist()
  }, [loadProfile, loadWishlist])

  const api: MarketplaceApi = {
    state,
    patch,
    enrichedItems,

    goHome: () =>
      patch({ cat: 'All', cond: 'All', query: '', sel: null, savedOnly: false, menuOpen: false, view: 'browse' }),
    setQuery: (v) => patch({ query: v, savedOnly: false, view: 'browse' }),
    clearQuery: () => patch({ query: '' }),
    selectCat: (label) => patch({ cat: label, savedOnly: false, view: 'browse' }),
    selectCond: (label) => patch({ cond: label }),
    selectSort: (k) => patch({ sort: k }),
    toggleSavedView: () =>
      patch((prev) => ({ savedOnly: !prev.savedOnly, cat: 'All', query: '', menuOpen: false, view: 'browse' })),
    toggleSaveItem: async (id: string) => {
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

    openItem: (it) => patch({ sel: it, menuOpen: false }),
    closeDetail: () => patch({ sel: null }),
    chatSeller: async () => {
      const sel = state.sel
      if (!sel || !sel.ownerId) return
      try {
        const cid = await getOrCreateConversation(sel.id, sel.ownerId)
        patch({ sel: null, view: 'messages', activeConvId: cid, msgDraft: '', menuOpen: false })
        await Promise.all([loadConversations(), loadMessages(cid)])
      } catch (e) {
        alert('Could not open chat: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    openSell: () => patch({ sellOpen: true, menuOpen: false, sel: null }),
    closeSell: () =>
      patch({
        sellOpen: false,
        listState: 'idle',
        bundleOn: false,
        f: { title: '', price: '', cat: 'Furniture', cond: 'Good', loc: 'Thomas Building', floor: '', desc: '' },
      }),
    reloadFeed: () => {
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query }, floorCode)
    },
    deleteMyListing: async (id) => {
      await deleteListing(id)
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query }, floorCode)
    },
    setF: (k, v) => patch((prev) => ({ f: { ...prev.f, [k]: v } })),
    toggleBundle: () => patch((prev) => ({ bundleOn: !prev.bundleOn })),
    submitListing: async (photos: File[]) => {
      if (state.listState !== 'idle') return
      const f = state.f
      const priceNum = Number((f.price || '').replace(/[^0-9]/g, ''))
      if (!f.title.trim()) {
        patch({ feedError: null })
        alert('Please enter an item title.')
        return
      }
      if (!priceNum || priceNum <= 0) {
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
          },
          photos,
        )
        patch({ listState: 'done' })
        // refresh feed + profile stats so the new listing shows immediately
        const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
        await loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query }, floorCode)
        loadProfile()
        listTimers.current.push(window.setTimeout(() => api.closeSell(), 900))
      } catch (e) {
        patch({ listState: 'idle' })
        alert('Could not post your listing: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    toggleMenu: () => patch((prev) => ({ menuOpen: !prev.menuOpen })),

    openMessages: () => {
      patch({ view: 'messages', menuOpen: false, sel: null })
      loadConversations()
    },
    openConversation: (id) => {
      patch({ activeConvId: id, msgDraft: '' })
      loadMessages(id)
      markConversationRead(id).then(() => loadConversations())
    },
    setMsgDraft: (v) => patch({ msgDraft: v }),
    sendMsg: async () => {
      const convId = state.activeConvId
      const d = state.msgDraft.trim()
      if (!convId || !d) return
      patch({ msgDraft: '' })
      try {
        await apiSendMessage(convId, d)
        await loadMessages(convId)
        loadConversations()
      } catch (e) {
        patch({ msgDraft: d })
        alert('Could not send: ' + (e instanceof Error ? e.message : 'unknown error'))
      }
    },

    openNotifs: () => {
      patch({ view: 'notifications', menuOpen: false, sel: null })
      loadNotifications()
    },
    selectNotifFilter: (k) => patch({ notifFilter: k }),
    markAllRead: async () => {
      await markAllNotificationsRead()
      loadNotifications()
    },
    openNotifTarget: async (n) => {
      markNotificationRead(n.id).catch(() => {})
      if (n.type === 'new_message' && n.reference_id) {
        patch({ view: 'messages', activeConvId: n.reference_id, menuOpen: false, sel: null })
        loadMessages(n.reference_id)
        markConversationRead(n.reference_id).then(() => loadConversations())
      } else if (n.type === 'order_update') {
        patch({ view: 'orders', menuOpen: false, sel: null })
      } else if (n.reference_id) {
        // price drop / item update → open the listing if it's in the current feed
        const it = state.feed.find((x) => x.id === n.reference_id) || null
        patch({ sel: it, view: it ? state.view : 'browse', menuOpen: false })
      }
      loadNotifications()
    },

    openProfile: () => patch({ view: 'profile', menuOpen: false, sel: null }),
    openEdit: () => patch((prev) => ({ editOpen: true, pf: { ...prev.profile }, pfError: null })),
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

    openCheckout: () => patch({ checkoutOpen: true, coStep: 'options', pay: 'cod', pickup: 'security' }),
    closeCheckout: () => patch({ checkoutOpen: false, coStep: 'options', sel: null }),
    setPay: (v) => patch({ pay: v }),
    setPickup: (v) => patch({ pickup: v }),
    coContinue: async () => {
      if (state.pay === 'qris') {
        patch({ coStep: 'qris' })
        return
      }
      if (await placeOrder()) patch({ coStep: 'done' })
    },
    coPaid: async () => {
      if (await placeOrder()) patch({ coStep: 'done' })
    },
    openOrders: () => patch({ view: 'orders', menuOpen: false, sel: null, checkoutOpen: false }),
    markOrderDropped: async (id) => {
      await markDroppedOff(id)
      await loadOrders()
    },
    confirmOrderPickup: async (id) => {
      await confirmPickup(id)
      await Promise.all([loadOrders(), loadProfile()])
    },
    cancelMyOrder: async (id) => {
      await cancelOrder(id)
      const floorCode = state.profile.floor ? state.profile.floor.toLowerCase() : null
      await Promise.all([loadOrders(), loadFeed({ cat: state.cat, cond: state.cond, sort: state.sort, query: state.query }, floorCode)])
    },
    submitReviewFor: async (order, rating, comment) => {
      await submitOrderReview(order, rating, comment)
      await Promise.all([loadOrders(), loadProfile()])
    },

    openSellerProfile: (id, name) => patch({ sellerOpen: true, sellerId: id, sellerName: name }),
    closeSellerProfile: () => patch({ sellerOpen: false }),

    logout: () => {
      // sign out of Supabase, then return to the login flow
      signOut()
        .catch(() => {})
        .finally(() => navigate('/', { replace: true }))
    },
    resetFilters: () => patch({ cat: 'All', cond: 'All', query: '', savedOnly: false }),
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
