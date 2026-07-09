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
  since: string
  // populated from the DB row (optional so the empty seed is valid)
  verification_status?: string
  profile_photo_url?: string | null
}
