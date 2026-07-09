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

export const BUILDINGS = ['Thomas Building', 'Union Building']
export const FLOORS = ['Ground', 'T1', 'T2', 'T3', 'U2', 'U3']
export const STANDINGS = ['Freshman', 'Sophomore', 'Junior', 'Senior']
