// Data-access layer: real Supabase queries + mappers between the DB row shapes
// and the UI display shape the marketplace components already use.
import { supabase } from './supabase'
import { getUser, type Profile as DbProfile } from './auth'
import type { Profile as UiProfile, EnrichedItem } from '../types'
import type { Tone } from '../theme'

export type { DbProfile }

// ---------------------------------------------------------------------------
// display formatters (DB codes → UI labels used by the existing components)
// ---------------------------------------------------------------------------
const BUILDING_LABEL: Record<string, string> = { thomas: 'Thomas Building', union: 'Union Building' }
const BUILDING_CODE: Record<string, 'thomas' | 'union'> = { 'Thomas Building': 'thomas', 'Union Building': 'union' }
const FLOOR_LABEL: Record<string, string> = { ground: 'Ground', t1: 'T1', t2: 'T2', t3: 'T3', u2: 'U2', u3: 'U3' }
const STANDING_LABEL: Record<string, string> = { freshman: 'Freshman', sophomore: 'Sophomore', junior: 'Junior', senior: 'Senior' }

function memberSince(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// DB profile → the camel-cased shape ProfileView / EditProfileModal / TopBar use.
export function dbToUiProfile(db: DbProfile): UiProfile & {
  verification_status: string
  profile_photo_url: string | null
} {
  return {
    name: db.name || '',
    studentId: db.student_id_number || '',
    whatsapp: db.whatsapp_number || '',
    building: db.building ? BUILDING_LABEL[db.building] || 'Thomas Building' : '',
    floor: db.floor ? FLOOR_LABEL[db.floor] || 'T1' : '',
    room: db.room_number || '',
    batch: db.batch_year ? `Class of ${db.batch_year}` : '',
    standing: db.class_standing ? STANDING_LABEL[db.class_standing] || '' : '',
    since: memberSince(db.created_at),
    verification_status: db.verification_status,
    profile_photo_url: db.profile_photo_url,
  }
}

// UI edit buffer (pf) → DB update columns.
export function uiEditsToDb(pf: UiProfile): Partial<DbProfile> {
  const digits = (pf.batch || '').replace(/[^0-9]/g, '')
  return {
    name: pf.name.trim(),
    student_id_number: pf.studentId.trim() || null,
    whatsapp_number: pf.whatsapp.trim() || null,
    building: pf.building ? BUILDING_CODE[pf.building] ?? null : null,
    floor: (pf.floor ? pf.floor.toLowerCase() : null) as DbProfile['floor'],
    room_number: pf.room.trim() || null,
    batch_year: digits ? Number(digits) : null,
    class_standing: (pf.standing ? pf.standing.toLowerCase() : null) as DbProfile['class_standing'],
  }
}

// ---------------------------------------------------------------------------
// profile reads / writes
// ---------------------------------------------------------------------------
export async function fetchMyProfile(): Promise<DbProfile | null> {
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) throw error
  return data as DbProfile
}

// Update only the caller's own row (RLS also enforces this). Privileged columns
// (role, verification_status, is_banned) are blocked by a DB trigger.
export async function updateMyProfile(fields: Partial<DbProfile>): Promise<DbProfile> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw error
  return data as DbProfile
}

// Avatar → public profile-photos bucket (reused as the "avatars" bucket).
// Owner-folder path so RLS lets only the owner write. Returns the public URL.
export async function uploadAvatar(file: File): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from('profile-photos').upload(path, file, { upsert: true })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
  await updateMyProfile({ profile_photo_url: data.publicUrl })
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// profile stats + lists (all real; empty for a fresh account)
// ---------------------------------------------------------------------------
export interface ProfileStats {
  selling: number // active listings
  buying: number // completed purchases
  reviewCount: number
  avgRating: number | null
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [selling, buying, reviews] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'active'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('status', 'completed'),
    supabase.from('reviews').select('rating').eq('reviewee_id', userId),
  ])
  const ratings = (reviews.data as { rating: number }[] | null) || []
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : null
  return {
    selling: selling.count || 0,
    buying: buying.count || 0,
    reviewCount: ratings.length,
    avgRating: avg,
  }
}

export interface DbListing {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  category: string | null
  condition: string | null
  is_graduation_bundle: boolean
  status: 'active' | 'sold' | 'removed' | 'flagged'
  building: string | null
  floor: string | null
  created_at: string
  updated_at: string
}

export async function fetchMyListings(): Promise<DbListing[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as DbListing[]) || []
}

export interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_name: string
}

// Reviews about the current user, with the reviewer's public name resolved via
// the public_profiles view (base profiles table is own-row-only under RLS).
export async function fetchReviewsAboutMe(): Promise<ReviewRow[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id')
    .eq('reviewee_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data as { id: string; rating: number; comment: string | null; created_at: string; reviewer_id: string | null }[]) || []
  if (rows.length === 0) return []
  const ids = [...new Set(rows.map((r) => r.reviewer_id).filter(Boolean))] as string[]
  const { data: people } = await supabase.from('public_profiles').select('id, name').in('id', ids)
  const nameById = new Map((people || []).map((p: { id: string; name: string }) => [p.id, p.name]))
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    reviewer_name: (r.reviewer_id && nameById.get(r.reviewer_id)) || 'A neighbour',
  }))
}

export async function fetchMyWishlist(): Promise<DbListing[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('wishlist')
    .select('listing:listing_id(*)')
    .eq('user_id', user.id)
  if (error) throw error
  const rows = (data as unknown as { listing: DbListing | null }[]) || []
  return rows.map((r) => r.listing).filter((l): l is DbListing => !!l)
}

// ===========================================================================
// LISTINGS FEED (Section 2) — real listings mapped into the card shape the
// existing components already render.
// ===========================================================================
const TONES: Tone[] = ['sand', 'sage', 'clay', 'haze', 'blush', 'olive']
function toneFor(id: string): Tone {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}
const CAT_LABEL: Record<string, string> = {
  furniture: 'Furniture', electronics: 'Electronics', appliances: 'Appliances',
  clothes: 'Clothes', books: 'Books', bundles: 'Bundles', others: 'Others',
}
const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

// proximity on DB floor codes (ground,t1,t2,t3,u2,u3)
const bldgOfCode = (f: string | null) => (f && f.charAt(0) === 'u' ? 'Union' : 'Thomas')
const floorOrder = (f: string | null) =>
  (bldgOfCode(f) === 'Union' ? ['u2', 'u3'] : ['ground', 't1', 't2', 't3']).indexOf(f || '')
function proximityCode(f: string | null, viewer: string | null): { rank: number; tag: string } {
  const label = f ? FLOOR_LABEL[f] || f.toUpperCase() : '—'
  const v = viewer || 't1'
  if (f && bldgOfCode(f) === bldgOfCode(v)) {
    const d = Math.abs(floorOrder(f) - floorOrder(v))
    return { rank: d, tag: label + (d === 0 ? ' · Your floor' : ` · ${d} floor${d > 1 ? 's' : ''} away`) }
  }
  return { rank: 100 + floorOrder(f), tag: label + ' · ' + bldgOfCode(f) + ' Building' }
}

interface FeedRow extends DbListing {
  is_featured: boolean
  listing_photos: { photo_url: string; sort_order: number }[] | null
}
interface SellerLite {
  id: string
  name: string
  profile_photo_url: string | null
  verification_status: string
}

function mapRow(r: FeedRow, seller: SellerLite | undefined, uid: string | undefined, viewerFloor: string | null, i: number): EnrichedItem {
  const photos = (r.listing_photos || []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const pr = proximityCode(r.floor, viewerFloor)
  const sellerName = seller?.name || 'Student'
  return {
    id: r.id,
    title: r.title,
    price: rupiah(r.price),
    priceNum: r.price,
    dorm: r.building ? BUILDING_LABEL[r.building] || '' : '',
    building: r.building ? BUILDING_LABEL[r.building] || '' : '',
    distance: '',
    cond: (r.condition as EnrichedItem['cond']) || 'Good',
    cat: r.category ? CAT_LABEL[r.category] || 'Others' : 'Others',
    rating: '—',
    trades: 0,
    seller: sellerName,
    sellerInitial: (sellerName.charAt(0) || '?').toUpperCase(),
    photo: r.title,
    tone: toneFor(r.id),
    mine: uid ? r.seller_id === uid : false,
    tag: r.is_featured ? 'FEATURED' : r.is_graduation_bundle ? 'GRAD BUNDLE' : '',
    hot: false,
    new: false,
    order: i,
    desc: r.description || '',
    floor: r.floor ? FLOOR_LABEL[r.floor] || '' : '',
    wa: undefined,
    proxTag: pr.tag,
    proxRank: pr.rank,
    photoUrl: photos.length ? photos[0].photo_url : null,
    isFeatured: r.is_featured,
    sellerVerified: seller?.verification_status === 'verified',
    ownerId: r.seller_id,
  }
}

export interface FeedOpts {
  cat?: string
  cond?: string
  sort?: 'Nearest' | 'Newest' | 'Price'
  query?: string
}

// Live feed: active listings only, filters applied, featured first, capped at 24.
export async function fetchFeed(opts: FeedOpts, viewerFloor: string | null): Promise<EnrichedItem[]> {
  const user = await getUser()
  let q = supabase
    .from('listings')
    .select('*, listing_photos(photo_url, sort_order)')
    .eq('status', 'active')
  if (opts.cat && opts.cat !== 'All') q = q.eq('category', opts.cat.toLowerCase())
  if (opts.cond && opts.cond !== 'All') q = q.eq('condition', opts.cond)
  if (opts.query && opts.query.trim()) q = q.ilike('title', `%${opts.query.trim()}%`)
  q = q.order('is_featured', { ascending: false })
  q = opts.sort === 'Price' ? q.order('price', { ascending: true }) : q.order('created_at', { ascending: false })
  q = q.limit(24)
  const { data, error } = await q
  if (error) throw error
  const rows = (data as FeedRow[]) || []
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))]
  const { data: people } = sellerIds.length
    ? await supabase.from('public_profiles').select('id, name, profile_photo_url, verification_status').in('id', sellerIds)
    : { data: [] as SellerLite[] }
  const byId = new Map((people as SellerLite[] | null || []).map((p) => [p.id, p]))
  const items = rows.map((r, i) => mapRow(r, byId.get(r.seller_id), user?.id, viewerFloor, i))
  // "Nearest" ranks by proximity (can't be done in SQL — depends on viewer floor)
  if (!opts.sort || opts.sort === 'Nearest') {
    items.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || a.proxRank - b.proxRank)
  }
  return items
}

// Category → count of active listings (for the sidebar).
export async function fetchCategoryCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('listings').select('category').eq('status', 'active')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const r of (data as { category: string | null }[]) || []) {
    const c = r.category ? CAT_LABEL[r.category] || 'Others' : 'Others'
    counts[c] = (counts[c] || 0) + 1
  }
  return counts
}

export interface NewListing {
  title: string
  priceNum: number
  category: string // display label e.g. "Furniture"
  condition: string // "Like new" | "Good" | "Fair"
  building: string // display label e.g. "Thomas Building" (or '')
  floor: string // DB code e.g. "t1" (or '')
  description: string
  isBundle: boolean
}

// Insert a listing owned by the current user, then upload its photos.
export async function createListing(input: NewListing, photos: File[]): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      title: input.title,
      price: input.priceNum,
      category: input.category.toLowerCase(),
      condition: input.condition || null,
      building: input.building ? BUILDING_CODE[input.building] ?? null : null,
      floor: input.floor || null,
      description: input.description || null,
      is_graduation_bundle: input.isBundle,
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw error
  const id = (data as { id: string }).id
  for (let i = 0; i < photos.length; i++) {
    const f = photos[i]
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${id}/${i}.${ext}`
    const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, f, { upsert: true })
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('listing-photos').getPublicUrl(path)
    const { error: insErr } = await supabase.from('listing_photos').insert({ listing_id: id, photo_url: pub.publicUrl, sort_order: i })
    if (insErr) throw insErr
  }
  return id
}

// Owner-only (enforced by RLS too).
export async function deleteListing(id: string): Promise<void> {
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}
