import type { Tone } from './theme'

export interface Item {
  id: number
  title: string
  price: string
  priceNum: number
  wasPrice?: string
  dorm: string
  building: string
  distance: string
  cond: 'Like new' | 'Good' | 'Fair'
  cat: string
  rating: string
  trades: number
  seller: string
  sellerInitial: string
  photo: string
  tone: Tone
  mine?: boolean
  tag: string
  hot: boolean
  new: boolean
  order: number
  desc: string
}

// item enriched with proximity + WhatsApp fields at render time
export interface EnrichedItem extends Item {
  floor: string
  wa?: string
  proxTag: string
  proxRank: number
}

export interface ThreadMsg {
  who: 'me' | 'them'
  text: string
}

export interface Chat {
  id: number
  name: string
  initial: string
  tone: Tone
  item: string
  last: string
  ago: string
  unread: boolean
  thread: ThreadMsg[]
}

export type NotifType = 'message' | 'item' | 'price' | 'order' | 'system'

export interface Notif {
  id: number
  type: NotifType
  title: string
  body: string
  ago: string
  unread: boolean
  chatId?: number
  itemId?: number
}

export interface Review {
  id: number
  name: string
  initial: string
  tone: Tone
  role: 'buyer' | 'seller'
  item: string
  stars: number
  ago: string
  text: string
}

export interface SellerReview {
  by: string
  initial: string
  tone: Tone
  stars: number
  ago: string
  item: string
  text: string
}

export interface Profile {
  name: string
  studentId: string
  whatsapp: string
  building: string
  room: string
  floor: string
  batch: string
  standing: string
  since: string
}
