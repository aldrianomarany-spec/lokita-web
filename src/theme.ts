// ============================================================
// LOKITA design tokens — ported from the Web v2 prototype.
// The brand accent is a tweakable variable; the prototype ships
// with the blue accent (the user's edit). Change ACCENT/ACCENT_DEEP
// to re-skin (pine #1B5E43, blue #2A5FA8, violet #8A4E9E, rust #B4531F).
// ============================================================

export const ACCENT = '#2A5FA8'
export const ACCENT_DEEP = '#1E4578'

// soft, warm/low-sat tint palette with matching stripe + label colours.
export type Tone = 'sand' | 'sage' | 'clay' | 'haze' | 'blush' | 'olive'

export interface ToneStyle {
  tint: string
  stripe: string
  label: string
}

export const T: Record<Tone, ToneStyle> = {
  sand: { tint: '#EAE1CB', stripe: 'rgba(150,120,60,.10)', label: '#9A8A5E' },
  sage: { tint: '#D9E3D6', stripe: 'rgba(60,110,70,.11)', label: '#5E8064' },
  clay: { tint: '#EBDDD2', stripe: 'rgba(150,90,60,.10)', label: '#9C7458' },
  haze: { tint: '#DBE1EA', stripe: 'rgba(70,90,130,.11)', label: '#6C7C9A' },
  blush: { tint: '#ECDEDD', stripe: 'rgba(150,80,80,.10)', label: '#9C6E6E' },
  olive: { tint: '#E4E5D3', stripe: 'rgba(110,120,60,.11)', label: '#7E8154' },
}

export type Category =
  | 'All'
  | 'Furniture'
  | 'Electronics'
  | 'Appliances'
  | 'Clothes'
  | 'Books'
  | 'Bundles'

export const CATEGORIES: Category[] = [
  'All',
  'Furniture',
  'Electronics',
  'Appliances',
  'Clothes',
  'Books',
  'Bundles',
]

export const CAT_META: Record<Category, string> = {
  All: '🧺',
  Furniture: '🪑',
  Electronics: '🎧',
  Appliances: '❄️',
  Clothes: '👕',
  Books: '📚',
  Bundles: '🎓',
}

export const CAT_DOT: Record<Category, string> = {
  All: '#EADFCB',
  Furniture: '#EAE1CB',
  Electronics: '#DBE1EA',
  Appliances: '#D9E3D6',
  Clothes: '#ECDEDD',
  Books: '#EBDDD2',
  Bundles: '#E4E5D3',
}

// categories offered in the Sell form (adds "Others")
export const SELL_CATEGORIES = [
  'Furniture',
  'Electronics',
  'Appliances',
  'Clothes',
  'Books',
  'Bundles',
  'Others',
]

export const BUILDINGS = ['Thomas Building', 'Union Building', 'Elizabeth Building', 'Main Building']

// Floors are specific to each building — codes are what the DB stores, labels
// are what the user sees. Security Post is a separate shared drop-off point and
// is intentionally NOT part of any building's floor list.
export interface FloorOption {
  code: string
  label: string
}
export const FLOORS_BY_BUILDING: Record<string, FloorOption[]> = {
  'Thomas Building': [
    { code: 'ground', label: 'Ground' },
    { code: 't1', label: 'T1' },
    { code: 't2', label: 'T2' },
    { code: 't3', label: 'T3' },
  ],
  'Union Building': [
    { code: 'u2', label: 'U2' },
    { code: 'u3', label: 'U3' },
  ],
  'Elizabeth Building': [
    { code: 'e1', label: 'Floor 1' },
    { code: 'e2', label: 'Floor 2' },
    { code: 'e3', label: 'Floor 3' },
  ],
  // JIU staff & lecturers — promoted to trade on LOKITA too
  'Main Building': [
    { code: 'mg', label: 'Ground' },
    { code: 'm1', label: 'Floor 1' },
    { code: 'm2', label: 'Floor 2' },
  ],
}
// every floor option across all buildings (for lookups)
export const ALL_FLOORS: FloorOption[] = Object.values(FLOORS_BY_BUILDING).flat()
export function floorsForBuilding(building: string): FloorOption[] {
  return FLOORS_BY_BUILDING[building] || []
}

export const STANDINGS = ['Freshman', 'Sophomore', 'Junior', 'Senior']


// ---- LOKITA revenue: seller-side platform fee, baked into the price ----
// When a seller publishes a listing, LOKITA adds a platform fee on top of
// their asking price: 5% of the ask, floored at Rp 1.000 and capped at
// Rp 4.000 (the "upload fee Rp 1.000–4.000" from the business model).
// The PUBLISHED price (what buyers see and pay everywhere) = ask + fee;
// the seller still receives their full asking price when the item sells.
// The DB recomputes this in a trigger (migration 0017) so the client
// preview here MUST use the exact same formula — buyers pay no extra fee
// at checkout, the platform cut is already inside the listed price.
export const PLATFORM_FEE_RATE = 0.05
export const PLATFORM_FEE_MIN = 1000
export const PLATFORM_FEE_MAX = 4000
export function platformFee(askPrice: number): number {
  if (!askPrice || askPrice <= 0) return 0
  return Math.min(PLATFORM_FEE_MAX, Math.max(PLATFORM_FEE_MIN, Math.round(askPrice * PLATFORM_FEE_RATE)))
}
export function publishedPrice(askPrice: number): number {
  if (!askPrice || askPrice <= 0) return 0
  return askPrice + platformFee(askPrice)
}
