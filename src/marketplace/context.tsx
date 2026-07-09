import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'
import {
  ITEMS,
  CHATS,
  FLOOR_BY_ID,
  WA_BY_SELLER,
  DEFAULT_PROFILE,
} from '../data'
import type { EnrichedItem, Item, Profile, SellerReview, ThreadMsg } from '../types'

export type View = 'browse' | 'messages' | 'notifications' | 'profile'
export type Sort = 'Nearest' | 'Newest' | 'Price'
export type CoStep = 'options' | 'qris' | 'done' | 'review' | 'reviewdone'
export type ListState = 'idle' | 'saving' | 'done'
export type Location = 'Thomas House' | 'Union Building'

export interface SellForm {
  title: string
  price: string
  cat: string
  loc: string
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
  location: Location
  saved: Record<number, boolean>
  chatId: number | null
  msgDraft: string
  extra: Record<number, ThreadMsg[]>
  read: Record<number, boolean>
  notifFilter: string
  notifRead: Record<number, boolean>
  photo: string | null
  editOpen: boolean
  checkoutOpen: boolean
  coStep: CoStep
  pay: 'cod' | 'qris'
  pickup: 'meet' | 'leave' | 'security'
  rvStars: number
  rvText: string
  reviewsBySeller: Record<string, SellerReview[]>
  sellerOpen: boolean
  sellerName: string | null
  profile: Profile
  pf: Profile
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
  location: 'Thomas House',
  saved: {},
  chatId: null,
  msgDraft: '',
  extra: {},
  read: {},
  notifFilter: 'all',
  notifRead: {},
  photo: null,
  editOpen: false,
  checkoutOpen: false,
  coStep: 'options',
  pay: 'cod',
  pickup: 'security',
  rvStars: 0,
  rvText: '',
  reviewsBySeller: {},
  sellerOpen: false,
  sellerName: null,
  profile: { ...DEFAULT_PROFILE },
  pf: { ...DEFAULT_PROFILE },
  listState: 'idle',
  bundleOn: false,
  f: { title: '', price: '', cat: 'Furniture', loc: 'Thomas Building', desc: '' },
}

// ---------- proximity model (viewer's floor first, then building, then across) ----------
const bldgOf = (fl: string) => (fl && fl.charAt(0) === 'U' ? 'Union' : 'Thomas')
const idxIn = (fl: string) =>
  (bldgOf(fl) === 'Union' ? ['U2', 'U3'] : ['Ground', 'T1', 'T2', 'T3']).indexOf(fl)

function proximity(fl: string, vFloor: string): { rank: number; tag: string } {
  if (bldgOf(fl) === bldgOf(vFloor)) {
    const d = Math.abs(idxIn(fl) - idxIn(vFloor))
    return {
      rank: d,
      tag: d === 0 ? `${fl} · Your floor` : `${fl} · ${d} floor${d > 1 ? 's' : ''} away`,
    }
  }
  return { rank: 100 + idxIn(fl), tag: `${fl} · ${bldgOf(fl)} Building` }
}

export interface MarketplaceApi {
  state: State
  patch: (p: Partial<State> | ((prev: State) => Partial<State>)) => void
  enrichedItems: EnrichedItem[]
  // actions
  goHome: () => void
  setQuery: (v: string) => void
  clearQuery: () => void
  toggleLocation: () => void
  selectCat: (label: string) => void
  selectCond: (label: string) => void
  selectSort: (k: Sort) => void
  toggleSavedView: () => void
  toggleSaveItem: (id: number) => void
  openItem: (it: Item) => void
  closeDetail: () => void
  chatSeller: () => void
  openSell: () => void
  closeSell: () => void
  setF: (k: keyof SellForm, v: string) => void
  toggleBundle: () => void
  submitListing: () => void
  toggleMenu: () => void
  openMessages: () => void
  openChat: (id: number) => void
  setMsgDraft: (v: string) => void
  sendMsg: (activeId: number) => void
  openNotifs: () => void
  selectNotifFilter: (k: string) => void
  markAllRead: () => void
  openNotifTarget: (n: { type: string; chatId?: number; itemId?: number; id: number }) => void
  openProfile: () => void
  openEdit: () => void
  closeEdit: () => void
  setPf: (k: keyof Profile, v: string) => void
  savePf: () => void
  pickPhoto: () => void
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  openCheckout: () => void
  closeCheckout: () => void
  setPay: (v: 'cod' | 'qris') => void
  setPickup: (v: 'meet' | 'leave' | 'security') => void
  coContinue: () => void
  coPaid: () => void
  coReview: () => void
  setRvStars: (n: number) => void
  setRvText: (v: string) => void
  submitReview: () => void
  openSellerProfile: (name: string | null) => void
  closeSellerProfile: () => void
  openWa: (wa: string | undefined, title: string | undefined) => void
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

  // enriched items (proximity + wa), recomputed when viewer floor changes
  const enrichedItems = useMemo<EnrichedItem[]>(() => {
    const vFloor = state.profile.floor || 'T1'
    return ITEMS.map((it) => {
      const floor = FLOOR_BY_ID[it.id]
      const pr = proximity(floor, vFloor)
      return { ...it, floor, wa: WA_BY_SELLER[it.seller], proxTag: pr.tag, proxRank: pr.rank }
    })
  }, [state.profile.floor])

  const api: MarketplaceApi = {
    state,
    patch,
    enrichedItems,

    goHome: () =>
      patch({ cat: 'All', cond: 'All', query: '', sel: null, savedOnly: false, menuOpen: false, view: 'browse' }),
    setQuery: (v) => patch({ query: v, savedOnly: false, view: 'browse' }),
    clearQuery: () => patch({ query: '' }),
    toggleLocation: () =>
      patch((prev) => ({ location: prev.location === 'Thomas House' ? 'Union Building' : 'Thomas House' })),
    selectCat: (label) => patch({ cat: label, savedOnly: false, view: 'browse' }),
    selectCond: (label) => patch({ cond: label }),
    selectSort: (k) => patch({ sort: k }),
    toggleSavedView: () =>
      patch((prev) => ({ savedOnly: !prev.savedOnly, cat: 'All', query: '', menuOpen: false, view: 'browse' })),
    toggleSaveItem: (id) =>
      patch((prev) => {
        const nx = { ...prev.saved }
        if (nx[id]) delete nx[id]
        else nx[id] = true
        return { saved: nx }
      }),

    openItem: (it) => patch({ sel: it, menuOpen: false }),
    closeDetail: () => patch({ sel: null }),
    chatSeller: () =>
      patch((prev) => {
        const match = CHATS.find((c) => c.name === (prev.sel && prev.sel.seller))
        const cid = match ? match.id : CHATS[0].id
        return { sel: null, view: 'messages', chatId: cid, read: { ...prev.read, [cid]: true }, menuOpen: false }
      }),

    openSell: () => patch({ sellOpen: true, menuOpen: false, sel: null }),
    closeSell: () =>
      patch({
        sellOpen: false,
        listState: 'idle',
        bundleOn: false,
        f: { title: '', price: '', cat: 'Furniture', loc: 'Thomas Building', desc: '' },
      }),
    setF: (k, v) => patch((prev) => ({ f: { ...prev.f, [k]: v } })),
    toggleBundle: () => patch((prev) => ({ bundleOn: !prev.bundleOn })),
    submitListing: () => {
      if (state.listState !== 'idle') return
      patch({ listState: 'saving' })
      listTimers.current.push(
        window.setTimeout(() => {
          patch({ listState: 'done' })
          listTimers.current.push(window.setTimeout(() => api.closeSell(), 1000))
        }, 600),
      )
    },

    toggleMenu: () => patch((prev) => ({ menuOpen: !prev.menuOpen })),

    openMessages: () => patch({ view: 'messages', menuOpen: false, sel: null }),
    openChat: (id) => patch((prev) => ({ chatId: id, read: { ...prev.read, [id]: true } })),
    setMsgDraft: (v) => patch({ msgDraft: v }),
    sendMsg: (activeId) =>
      patch((prev) => {
        const d = prev.msgDraft.trim()
        if (!d) return {}
        return {
          extra: { ...prev.extra, [activeId]: (prev.extra[activeId] || []).concat([{ who: 'me', text: d }]) },
          msgDraft: '',
        }
      }),

    openNotifs: () => patch({ view: 'notifications', menuOpen: false, sel: null }),
    selectNotifFilter: (k) => patch({ notifFilter: k }),
    markAllRead: () =>
      patch((prev) => {
        const nr = { ...prev.notifRead }
        // NOTIFS ids are static
        for (let i = 1; i <= 7; i++) nr[i] = true
        return { notifRead: nr }
      }),
    openNotifTarget: (n) =>
      patch((prev) => {
        const nr = { ...prev.notifRead, [n.id]: true }
        if (n.type === 'message' && n.chatId != null) {
          return { notifRead: nr, view: 'messages', chatId: n.chatId, read: { ...prev.read, [n.chatId]: true } }
        }
        if (n.itemId != null) {
          const it = enrichedItems.find((x) => x.id === n.itemId) || null
          return { notifRead: nr, sel: it }
        }
        return { notifRead: nr }
      }),

    openProfile: () => patch({ view: 'profile', menuOpen: false, sel: null }),
    openEdit: () => patch((prev) => ({ editOpen: true, pf: { ...prev.profile } })),
    closeEdit: () => patch({ editOpen: false }),
    setPf: (k, v) => patch((prev) => ({ pf: { ...prev.pf, [k]: v } })),
    savePf: () => patch((prev) => ({ profile: { ...prev.pf }, editOpen: false })),
    pickPhoto: () => {
      const el = document.getElementById('lok-photo-input') as HTMLInputElement | null
      el?.click()
    },
    onPhoto: (e) => {
      const file = e.target.files && e.target.files[0]
      if (file) patch({ photo: URL.createObjectURL(file) })
    },

    openCheckout: () => patch({ checkoutOpen: true, coStep: 'options', pay: 'cod', pickup: 'security' }),
    closeCheckout: () => patch({ checkoutOpen: false, coStep: 'options', sel: null }),
    setPay: (v) => patch({ pay: v }),
    setPickup: (v) => patch({ pickup: v }),
    coContinue: () => patch((prev) => ({ coStep: prev.pay === 'qris' ? 'qris' : 'done' })),
    coPaid: () => patch({ coStep: 'done' }),
    coReview: () => patch({ coStep: 'review', rvStars: 0, rvText: '' }),
    setRvStars: (n) => patch({ rvStars: n }),
    setRvText: (v) => patch({ rvText: v }),
    submitReview: () =>
      patch((prev) => {
        const name = prev.sel && prev.sel.seller
        if (!name || !prev.rvStars) return {}
        const rev: SellerReview = {
          by: prev.profile.name,
          initial: (prev.profile.name || 'A').charAt(0),
          tone: 'sand',
          stars: prev.rvStars,
          ago: 'just now',
          item: prev.sel!.title,
          text: prev.rvText.trim() || 'Great trade — smooth, friendly and on time.',
        }
        const cur = prev.reviewsBySeller[name] || []
        return { reviewsBySeller: { ...prev.reviewsBySeller, [name]: [rev, ...cur] }, coStep: 'reviewdone' }
      }),

    openSellerProfile: (name) => patch({ sellerOpen: true, sellerName: name }),
    closeSellerProfile: () => patch({ sellerOpen: false }),

    openWa: (wa, title) => {
      if (wa)
        window.open(
          'https://wa.me/' +
            wa +
            '?text=' +
            encodeURIComponent(`Hi! I saw your "${title || 'item'}" on Lokita — is it still available?`),
          '_blank',
        )
    },

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
