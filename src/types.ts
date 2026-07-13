import type { Tone } from './theme'

export interface Item {
  id: string
  title: string
  price: string
  priceNum: number
  dorm: string
  building: string
  distance: string
  cond: 'Like new' | 'Good' | 'Fair'
  cat: string
  seller: string
  sellerInitial: string
  photo: string
  tone: Tone
  mine?: boolean
  tag: string
  order: number
  desc: string
  // real-listing extras
  photoUrl?: string | null
  photoUrls?: string[]
  bundleItems?: string[]
  platformFee?: number // LOKITA's cut already inside priceNum; seller gets priceNum − platformFee
  isFeatured?: boolean
  sellerVerified?: boolean
  ownerId?: string
}

// item enriched with proximity fields at render time
export interface EnrichedItem extends Item {
  floor: string
  proxTag: string
  proxRank: number
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
  major: string
  since: string
  // populated from the DB row (optional so the empty seed is valid)
  verification_status?: string
  profile_photo_url?: string | null
  role?: 'user' | 'admin' // unlocks the Control Room view
  banned?: boolean // restricted account: browse-only, shown a banner
}
