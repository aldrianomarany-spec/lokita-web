// Data-access layer: real Supabase queries + mappers between the DB row shapes
// and the UI display shape the marketplace components already use.
import { supabase } from './supabase'
import { getUser, type Profile as DbProfile } from './auth'
import type { Profile as UiProfile, EnrichedItem } from '../types'
import type { Tone } from '../theme'

export type { DbProfile }

export async function getUserId(): Promise<string | null> {
  const u = await getUser()
  return u?.id ?? null
}

// ---------------------------------------------------------------------------
// display formatters (DB codes → UI labels used by the existing components)
// ---------------------------------------------------------------------------
const BUILDING_LABEL: Record<string, string> = { thomas: 'Thomas Building', union: 'Union Building', elizabeth: 'Elizabeth Building', main: 'Main Building' }
const BUILDING_CODE: Record<string, 'thomas' | 'union' | 'elizabeth' | 'main'> = { 'Thomas Building': 'thomas', 'Union Building': 'union', 'Elizabeth Building': 'elizabeth', 'Main Building': 'main' }
const FLOOR_LABEL: Record<string, string> = { ground: 'Ground', t1: 'T1', t2: 'T2', t3: 'T3', u2: 'U2', u3: 'U3', e1: 'Floor 1', e2: 'Floor 2', e3: 'Floor 3', mg: 'Ground', m1: 'Floor 1', m2: 'Floor 2' }
// floor label → code must be resolved per-building (labels like "Ground" and
// "Floor 1" repeat across buildings).
import { FLOORS_BY_BUILDING } from '../theme'
function floorCodeFor(buildingLabel: string, floorLabel: string): string | null {
  const opts = FLOORS_BY_BUILDING[buildingLabel] || []
  return opts.find((o) => o.label === floorLabel)?.code ?? null
}
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
    role: db.role,
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
    floor: (pf.floor && pf.building ? floorCodeFor(pf.building, pf.floor) : null) as DbProfile['floor'],
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
  // housekeeping: previous avatar files are junk now — remove them
  const { data: files } = await supabase.storage.from('profile-photos').list(user.id)
  const stale = (files || [])
    .filter((f) => f.name.startsWith('avatar') && !path.endsWith('/' + f.name))
    .map((f) => `${user.id}/${f.name}`)
  if (stale.length) await supabase.storage.from('profile-photos').remove(stale).catch(() => {})
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// profile stats + lists (all real; empty for a fresh account)
// ---------------------------------------------------------------------------
export interface ProfileStats {
  selling: number // active listings for sale
  sold: number // completed sales (as seller)
  buying: number // completed purchases (as buyer)
  reviewCount: number
  avgRating: number | null
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [selling, sold, buying, reviews] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'active'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'completed'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).eq('status', 'completed'),
    supabase.from('reviews').select('rating').eq('reviewee_id', userId),
  ])
  const ratings = (reviews.data as { rating: number }[] | null) || []
  const avg = ratings.length ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : null
  return {
    selling: selling.count || 0,
    sold: sold.count || 0,
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
  price: number // PUBLISHED price — seller's ask + platform_fee (trigger-computed)
  platform_fee: number
  category: string | null
  condition: string | null
  is_graduation_bundle: boolean
  bundle_items: string[] | null
  status: 'active' | 'sold' | 'removed' | 'flagged'
  building: string | null
  floor: string | null
  created_at: string
  updated_at: string
  photoUrl?: string | null
}

// first photo url from an embedded listing_photos array
function firstPhoto(photos: { photo_url: string; sort_order: number }[] | null | undefined): string | null {
  if (!photos || !photos.length) return null
  return photos.slice().sort((a, b) => a.sort_order - b.sort_order)[0].photo_url
}

export async function fetchMyListings(): Promise<DbListing[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(photo_url, sort_order)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data as (DbListing & { listing_photos: { photo_url: string; sort_order: number }[] })[]) || []).map((r) => ({
    ...r,
    photoUrl: firstPhoto(r.listing_photos),
  }))
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
  return fetchReviewsForUser(user.id)
}

// Public reviews about any user (for the seller-profile modal).
export async function fetchReviewsForUser(userId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id')
    .eq('reviewee_id', userId)
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

// Just the listing ids the caller has saved — used to hydrate the ♡ state map.
export async function fetchWishlistIds(): Promise<string[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase.from('wishlist').select('listing_id').eq('user_id', user.id)
  if (error) throw error
  return ((data as { listing_id: string }[]) || []).map((r) => r.listing_id)
}

export async function addToWishlist(listingId: string): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  // idempotent: ignore a duplicate-key error if it's already saved
  const { error } = await supabase.from('wishlist').upsert(
    { user_id: user.id, listing_id: listingId },
    { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
  )
  if (error) throw error
}

export async function removeFromWishlist(listingId: string): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase.from('wishlist').delete().eq('user_id', user.id).eq('listing_id', listingId)
  if (error) throw error
}

export async function fetchMyWishlist(): Promise<DbListing[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('wishlist')
    .select('listing:listing_id(*, listing_photos(photo_url, sort_order))')
    .eq('user_id', user.id)
  if (error) throw error
  const rows = (data as unknown as { listing: (DbListing & { listing_photos: { photo_url: string; sort_order: number }[] }) | null }[]) || []
  return rows
    .map((r) => r.listing)
    .filter((l): l is DbListing & { listing_photos: { photo_url: string; sort_order: number }[] } => !!l)
    .map((l) => ({ ...l, photoUrl: firstPhoto(l.listing_photos) }))
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

// proximity on DB floor codes (ground,t1,t2,t3 / u2,u3 / e1,e2,e3)
const FLOOR_SEQ: Record<string, string[]> = {
  Thomas: ['ground', 't1', 't2', 't3'],
  Union: ['u2', 'u3'],
  Elizabeth: ['e1', 'e2', 'e3'],
  Main: ['mg', 'm1', 'm2'],
}
const bldgOfCode = (f: string | null) => {
  const c = f ? f.charAt(0) : ''
  return c === 'u' ? 'Union' : c === 'e' ? 'Elizabeth' : c === 'm' ? 'Main' : 'Thomas'
}
const floorOrder = (f: string | null) => FLOOR_SEQ[bldgOfCode(f)].indexOf(f || '')
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
    seller: sellerName,
    sellerInitial: (sellerName.charAt(0) || '?').toUpperCase(),
    photo: r.title,
    tone: toneFor(r.id),
    mine: uid ? r.seller_id === uid : false,
    tag: r.is_featured ? 'FEATURED' : r.is_graduation_bundle ? 'GRAD BUNDLE' : '',
    order: i,
    desc: r.description || '',
    floor: r.floor ? FLOOR_LABEL[r.floor] || '' : '',
    proxTag: pr.tag,
    proxRank: pr.rank,
    photoUrl: photos.length ? photos[0].photo_url : null,
    photoUrls: photos.map((p) => p.photo_url),
    bundleItems: r.bundle_items || undefined,
    platformFee: r.platform_fee || 0,
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
  building?: string // display label (e.g. "Thomas Building") or "All"
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
  if (opts.building && opts.building !== 'All') {
    const code = BUILDING_CODE[opts.building]
    if (code) q = q.eq('building', code)
  }
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
  priceNum: number // the seller's ASK — the DB adds the platform fee on top

  category: string // display label e.g. "Furniture"
  condition: string // "Like new" | "Good" | "Fair"
  building: string // display label e.g. "Thomas Building" (or '')
  floor: string // DB code e.g. "t1" (or '')
  description: string
  isBundle: boolean
  bundleItems: string[] // what's inside a graduation bundle
}

// Insert a listing owned by the current user, then upload its photos.
// `priceNum` is the seller's asking price — the apply_platform_fee trigger
// (migration 0017) sets platform_fee and publishes at ask + fee, so the fee
// can't be dodged by a modified client.
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
      bundle_items: input.isBundle && input.bundleItems.length ? input.bundleItems : null,
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

// Owner-only (enforced by RLS too). Also removes the listing's photo files
// from storage — otherwise they'd sit there as junk forever.
export async function deleteListing(id: string): Promise<void> {
  const user = await getUser()
  if (user) {
    const dir = `${user.id}/${id}`
    const { data: files } = await supabase.storage.from('listing-photos').list(dir)
    if (files && files.length) {
      await supabase.storage.from('listing-photos').remove(files.map((f) => `${dir}/${f.name}`)).catch(() => {})
    }
  }
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

// ===========================================================================
// ORDERS / TRANSACTIONS (Section 3) — real lifecycle: paid → dropped_off →
// completed (+ cancelled). Deadlines generated here; a DB trigger reserves the
// listing on order and frees it on cancel.
// ===========================================================================
export type OrderStatus = 'pending' | 'paid' | 'dropped_off' | 'completed' | 'cancelled'
export type PaymentMethod = 'cod' | 'qris'
export type PickupMethod = 'meet_in_person' | 'trusted_handoff' | 'security_post'

const DAY = 86_400_000

export interface NewOrder {
  listingId: string
  sellerId: string
  payment_method: PaymentMethod
  pickup_method: PickupMethod
}

export async function createOrder(o: NewOrder): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  if (o.sellerId === user.id) throw new Error("You can't buy your own listing.")
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      listing_id: o.listingId,
      buyer_id: user.id,
      seller_id: o.sellerId,
      payment_method: o.payment_method,
      // money is only "paid" once the Midtrans webhook confirms it (QRIS) or
      // cash changes hands at pickup (COD)
      payment_status: 'pending',
      pickup_method: o.pickup_method,
      // the SELLER must confirm the payment arrived and accept before the
      // order proceeds; the drop-off deadline starts at acceptance
      status: 'pending',
      paid_at: null,
      dropoff_deadline: null,
    })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

// ---- real QRIS payment (Midtrans via our Vercel serverless functions) ----
export interface QrisCharge {
  orderId: string
  qrUrl: string
  amount: number
}

// Ask the server to create a Midtrans QRIS charge for an order we just placed.
// Returns the QR image URL to display; the webhook marks the order paid.
export async function createQrisCharge(transactionId: string): Promise<QrisCharge> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  const r = await fetch('/api/qris/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transactionId }),
  })
  const j = (await r.json().catch(() => ({}))) as Partial<QrisCharge> & { error?: string }
  if (!r.ok) throw new Error(j.error || 'Could not start QRIS payment')
  return j as QrisCharge
}

// Seller confirms the payment arrived and accepts the order; the 2-day
// drop-off window starts now. (DB trigger enforces seller-only.)
export async function acceptOrder(id: string): Promise<void> {
  const now = Date.now()
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'paid', payment_status: 'paid', paid_at: new Date(now).toISOString(), dropoff_deadline: new Date(now + 2 * DAY).toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markDroppedOff(id: string): Promise<void> {
  const now = Date.now()
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'dropped_off', dropped_off_at: new Date(now).toISOString(), pickup_deadline: new Date(now + 2 * DAY).toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function confirmPickup(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'completed', completed_at: new Date().toISOString(), payment_status: 'paid' })
    .eq('id', id)
  if (error) throw error
}

export async function cancelOrder(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
}

export interface OrderRow {
  id: string
  status: OrderStatus
  payment_method: PaymentMethod | null
  payment_status: string
  pickup_method: PickupMethod | null
  created_at: string
  paid_at: string | null
  dropped_off_at: string | null
  dropoff_deadline: string | null
  pickup_deadline: string | null
  completed_at: string | null
  listing_id: string | null
  listing_title: string
  listing_price: number
  buyer_id: string
  seller_id: string
  role: 'buyer' | 'seller'
  counterparty_id: string
  counterparty_name: string
  counterparty_verified: boolean
  reviewed: boolean
}

export async function fetchMyOrders(): Promise<OrderRow[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('transactions')
    .select('*, listing:listing_id(title, price)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data as (Record<string, unknown> & { listing: { title: string; price: number } | null; buyer_id: string; seller_id: string; id: string })[]) || []
  const otherIds = [...new Set(rows.map((r) => (r.buyer_id === user.id ? r.seller_id : r.buyer_id)).filter(Boolean))]
  const { data: people } = otherIds.length
    ? await supabase.from('public_profiles').select('id, name, verification_status').in('id', otherIds)
    : { data: [] as { id: string; name: string; verification_status: string }[] }
  const byId = new Map(((people as { id: string; name: string; verification_status: string }[] | null) || []).map((p) => [p.id, p]))
  const { data: myReviews } = await supabase.from('reviews').select('transaction_id').eq('reviewer_id', user.id)
  const reviewed = new Set(((myReviews as { transaction_id: string }[] | null) || []).map((r) => r.transaction_id))
  return rows.map((r) => {
    const role: 'buyer' | 'seller' = r.buyer_id === user.id ? 'buyer' : 'seller'
    const counterparty_id = role === 'buyer' ? r.seller_id : r.buyer_id
    const other = byId.get(counterparty_id)
    const listing = r.listing
    return {
      ...(r as unknown as OrderRow),
      listing_title: listing?.title || '(listing removed)',
      listing_price: listing?.price ?? 0,
      role,
      counterparty_id,
      counterparty_name: other?.name || 'Student',
      counterparty_verified: other?.verification_status === 'verified',
      reviewed: reviewed.has(r.id),
    }
  })
}

// Realtime: refetch the feed on any listing change (new post, price change,
// sold/removed). RLS scopes which rows a client actually receives.
export function subscribeListings(onChange: () => void): () => void {
  const channel = supabase
    .channel('listings-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Realtime: refetch on any change to the current user's transactions.
export function subscribeOrders(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel('orders-' + userId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Post a review for a completed order (buyer↔seller). RLS enforces "completed +
// counterparty only".
export async function submitOrderReview(order: OrderRow, rating: number, comment: string): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase.from('reviews').insert({
    transaction_id: order.id,
    reviewer_id: user.id,
    reviewee_id: order.counterparty_id,
    rating,
    comment: comment.trim() || null,
  })
  if (error) throw error
}

// ===========================================================================
// MESSAGES + NOTIFICATIONS (Section 4) — real conversations, messages,
// notifications, and realtime subscriptions. All RLS-scoped to the caller.
// ===========================================================================
export interface ConversationRow {
  id: string
  listing_id: string | null
  other_id: string
  other_name: string
  other_photo: string | null
  other_verified: boolean
  last_content: string
  last_at: string
  unread: number
  // product context (null for direct/request chats)
  item_title: string
  item_price: number | null
  item_photo: string | null
  item_status: string | null
}

export async function fetchConversations(): Promise<ConversationRow[]> {
  const uid = await getUserId()
  if (!uid) return []
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*, listing:listing_id(title, price, status, listing_photos(photo_url, sort_order))')
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
  if (error) throw error
  const rows = (convs as (Record<string, unknown> & { id: string; buyer_id: string; seller_id: string; listing_id: string | null; created_at: string; listing: { title: string; price: number; status: string; listing_photos: { photo_url: string; sort_order: number }[] | null } | null })[]) || []
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, content, is_read, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: true })
  const byConv = new Map<string, { sender_id: string; content: string; is_read: boolean; created_at: string }[]>()
  for (const m of (msgs as { conversation_id: string; sender_id: string; content: string; is_read: boolean; created_at: string }[] | null) || []) {
    const arr = byConv.get(m.conversation_id) || []
    arr.push(m)
    byConv.set(m.conversation_id, arr)
  }
  const otherIds = [...new Set(rows.map((r) => (r.buyer_id === uid ? r.seller_id : r.buyer_id)).filter(Boolean))]
  const { data: people } = otherIds.length
    ? await supabase.from('public_profiles').select('id, name, profile_photo_url, verification_status').in('id', otherIds)
    : { data: [] as SellerLite[] }
  const byId = new Map(((people as SellerLite[] | null) || []).map((p) => [p.id, p]))
  const result: ConversationRow[] = rows.map((r) => {
    const otherId = r.buyer_id === uid ? r.seller_id : r.buyer_id
    const other = byId.get(otherId)
    const ms = byConv.get(r.id) || []
    const last = ms[ms.length - 1]
    return {
      id: r.id,
      listing_id: r.listing_id,
      other_id: otherId,
      other_name: other?.name || 'Student',
      other_photo: other?.profile_photo_url || null,
      other_verified: other?.verification_status === 'verified',
      last_content: last?.content || '',
      last_at: last?.created_at || r.created_at,
      unread: ms.filter((m) => m.sender_id !== uid && !m.is_read).length,
      item_title: r.listing?.title || '',
      item_price: r.listing?.price ?? null,
      item_photo: firstPhoto(r.listing?.listing_photos),
      item_status: r.listing?.status ?? null,
    }
  })
  result.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
  return result
}

export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as MessageRow[]) || []
}

// buyer messaging a seller about a listing — reuse the existing thread if any
export async function getOrCreateConversation(listingId: string, sellerId: string): Promise<string> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  if (sellerId === uid) throw new Error("That's your own listing.")
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', uid)
    .maybeSingle()
  if (existing) return (existing as { id: string }).id
  const { data, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: uid, seller_id: sellerId })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function sendMessage(conversationId: string, content: string): Promise<void> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  const trimmed = content.trim()
  if (!trimmed) return
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: uid, content: trimmed })
  if (error) throw error
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const uid = await getUserId()
  if (!uid) return
  await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).neq('sender_id', uid).eq('is_read', false)
}

// ---- notifications ----
export type NotifType = 'new_message' | 'item_update' | 'price_drop' | 'order_update' | 'system'
export interface NotifRow {
  id: string
  type: NotifType
  reference_id: string | null
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export async function fetchNotifications(): Promise<NotifRow[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data as NotifRow[]) || []
}

export async function markAllNotificationsRead(): Promise<void> {
  const uid = await getUserId()
  if (!uid) return
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false)
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

// ---- realtime (RLS-filtered by Supabase to the current user's rows) ----
export function subscribeMessages(userId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel('msgs-' + userId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}

export function subscribeNotifications(userId: string, onChange: () => void, onNew?: (n: NotifRow) => void): () => void {
  const ch = supabase
    .channel('notifs-' + userId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
      onChange()
      if (onNew && payload.new) onNew(payload.new as NotifRow)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}

// ===========================================================================
// REQUESTS — buyers post "looking for X"; anyone signed in can respond.
// ===========================================================================
export interface RequestRow {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  budget_max: number | null
  status: 'open' | 'fulfilled' | 'closed'
  created_at: string
  requester_name: string
  requester_photo: string | null
  requester_verified: boolean
  mine: boolean
}

export async function fetchRequests(): Promise<RequestRow[]> {
  const uid = await getUserId()
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  const rows = (data as Omit<RequestRow, 'requester_name' | 'requester_photo' | 'requester_verified' | 'mine'>[]) || []
  if (!rows.length) return []
  const ids = [...new Set(rows.map((r) => r.user_id))]
  const { data: people } = await supabase
    .from('public_profiles')
    .select('id, name, profile_photo_url, verification_status')
    .in('id', ids)
  const byId = new Map(((people as SellerLite[] | null) || []).map((p) => [p.id, p]))
  return rows.map((r) => {
    const p = byId.get(r.user_id)
    return {
      ...r,
      requester_name: p?.name || 'Student',
      requester_photo: p?.profile_photo_url || null,
      requester_verified: p?.verification_status === 'verified',
      mine: uid ? r.user_id === uid : false,
    }
  })
}

export interface NewRequest {
  title: string
  category: string // display label
  budgetMax: number | null
  description: string
}

export async function createRequest(input: NewRequest): Promise<void> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  const { error } = await supabase.from('requests').insert({
    user_id: uid,
    title: input.title,
    category: input.category ? input.category.toLowerCase() : null,
    budget_max: input.budgetMax,
    description: input.description || null,
  })
  if (error) throw error
}

// Owner closes their request ('fulfilled' when someone came through).
export async function setRequestStatus(id: string, status: 'fulfilled' | 'closed'): Promise<void> {
  const { error } = await supabase.from('requests').update({ status }).eq('id', id)
  if (error) throw error
}

// Chat about a request: a conversation WITHOUT a listing between the helper
// (buyer_id = me) and the requester (seller_id). Reuses an existing thread.
export async function getOrCreateRequestConversation(requesterId: string): Promise<string> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  if (requesterId === uid) throw new Error("That's your own request.")
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .is('listing_id', null)
    .eq('buyer_id', uid)
    .eq('seller_id', requesterId)
    .limit(1)
    .maybeSingle()
  if (existing) return (existing as { id: string }).id
  const { data, error } = await supabase
    .from('conversations')
    .insert({ listing_id: null, buyer_id: uid, seller_id: requesterId })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

// ===========================================================================
// PEOPLE — every member of the marketplace, with live online presence.
// Presence uses Supabase Realtime Presence: nothing is written to the
// database, so it costs zero storage. Guests neither appear nor see this.
// ===========================================================================
export interface MemberRow {
  id: string
  name: string
  photo: string | null
  building: string // display label or ''
  verified: boolean
  since: string
}

export async function fetchMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, name, profile_photo_url, building, verification_status, created_at')
    .order('name', { ascending: true })
    .limit(200)
  if (error) throw error
  const rows = (data as { id: string; name: string; profile_photo_url: string | null; building: string | null; verification_status: string; created_at: string }[]) || []
  return rows.map((r) => ({
    id: r.id,
    name: r.name || 'Student',
    photo: r.profile_photo_url,
    building: r.building ? BUILDING_LABEL[r.building] || '' : '',
    verified: r.verification_status === 'verified',
    since: memberSince(r.created_at),
  }))
}

// Join the shared presence channel as `uid` and report the set of online user
// ids whenever it changes (join/leave/sync).
export function subscribePresence(uid: string, onChange: (onlineIds: string[]) => void): () => void {
  const ch = supabase.channel('lokita-online', { config: { presence: { key: uid } } })
  const emit = () => onChange(Object.keys(ch.presenceState()))
  ch.on('presence', { event: 'sync' }, emit)
    .on('presence', { event: 'join' }, emit)
    .on('presence', { event: 'leave' }, emit)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ online_at: new Date().toISOString() })
    })
  return () => {
    supabase.removeChannel(ch)
  }
}

// ===========================================================================
// MEMBER PROFILE PAGE — full public profile of another member.
// ===========================================================================
export interface MemberProfileInfo {
  id: string
  name: string
  photo: string | null
  building: string
  floor: string
  batch: string
  standing: string
  verified: boolean
  since: string
}

export async function fetchMemberProfile(id: string): Promise<MemberProfileInfo | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, name, profile_photo_url, building, floor, batch_year, class_standing, verification_status, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as { id: string; name: string; profile_photo_url: string | null; building: string | null; floor: string | null; batch_year: number | null; class_standing: string | null; verification_status: string; created_at: string }
  return {
    id: r.id,
    name: r.name || 'Student',
    photo: r.profile_photo_url,
    building: r.building ? BUILDING_LABEL[r.building] || '' : '',
    floor: r.floor ? FLOOR_LABEL[r.floor] || '' : '',
    batch: r.batch_year ? `Class of ${r.batch_year}` : '',
    standing: r.class_standing ? STANDING_LABEL[r.class_standing] || '' : '',
    verified: r.verification_status === 'verified',
    since: memberSince(r.created_at),
  }
}

// Selling/sold counts via the SECURITY DEFINER member_stats function (0014) —
// transactions themselves stay party-only; only the two counts are exposed.
export async function fetchMemberStats(id: string): Promise<{ selling: number; sold: number }> {
  const { data, error } = await supabase.rpc('member_stats', { uid: id })
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as { selling: number; sold: number } | undefined
  return { selling: Number(row?.selling || 0), sold: Number(row?.sold || 0) }
}

// A member's active listings, mapped to the card shape (clicking opens the
// normal item detail).
export async function fetchMemberListings(id: string, viewerFloor: string | null): Promise<EnrichedItem[]> {
  const user = await getUser()
  const [{ data, error }, { data: person }] = await Promise.all([
    supabase
      .from('listings')
      .select('*, listing_photos(photo_url, sort_order)')
      .eq('seller_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase.from('public_profiles').select('id, name, profile_photo_url, verification_status').eq('id', id).maybeSingle(),
  ])
  if (error) throw error
  const seller = (person as SellerLite | null) || undefined
  return ((data as FeedRow[]) || []).map((r, i) => mapRow(r, seller, user?.id, viewerFloor, i))
}

// Realtime: refetch the requests board on any change (new/fulfilled/removed).
export function subscribeRequests(onChange: () => void): () => void {
  const ch = supabase
    .channel('requests-board')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}


// Realtime: the signed-in user's own profile row (details edited elsewhere,
// verification badge granted, admin changes) — refresh the UI live.
export function subscribeMyProfile(userId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel('me-' + userId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}


// One listing by id, mapped to the card/detail shape (used to open the item
// straight from a chat's pinned product card).
export async function fetchListingById(id: string, viewerFloor: string | null): Promise<EnrichedItem | null> {
  const user = await getUser()
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(photo_url, sort_order)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as FeedRow
  const { data: person } = await supabase
    .from('public_profiles')
    .select('id, name, profile_photo_url, verification_status')
    .eq('id', row.seller_id)
    .maybeSingle()
  return mapRow(row, (person as SellerLite | null) || undefined, user?.id, viewerFloor, 0)
}

// ===========================================================================
// ADMIN (Control Room) — every call here is protected by RLS: the `is_admin()`
// policies from migration 0001 let role='admin' accounts read all profiles /
// listings / transactions and moderate them. Non-admins get RLS-filtered
// results (or errors), so the UI gate in AdminView is convenience, not
// security.
// ===========================================================================

export interface AdminStats {
  members: number
  activeListings: number
  soldListings: number
  completedOrders: number
  feeCollected: number // LOKITA revenue: platform_fee summed over SOLD listings
  feePending: number // fees riding on currently-active listings
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const [profilesRes, listingsRes, txRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('status, platform_fee'),
    supabase.from('transactions').select('status'),
  ])
  if (profilesRes.error) throw profilesRes.error
  if (listingsRes.error) throw listingsRes.error
  if (txRes.error) throw txRes.error
  const listings = (listingsRes.data as { status: string; platform_fee: number | null }[]) || []
  const tx = (txRes.data as { status: string }[]) || []
  const sum = (rows: typeof listings) => rows.reduce((a, r) => a + Number(r.platform_fee || 0), 0)
  return {
    members: profilesRes.count || 0,
    activeListings: listings.filter((l) => l.status === 'active').length,
    soldListings: listings.filter((l) => l.status === 'sold').length,
    completedOrders: tx.filter((t) => t.status === 'completed').length,
    feeCollected: sum(listings.filter((l) => l.status === 'sold')),
    feePending: sum(listings.filter((l) => l.status === 'active')),
  }
}

export interface AdminListingRow {
  id: string
  title: string
  price: number
  platform_fee: number
  status: string
  is_featured: boolean
  created_at: string
  seller_id: string
  seller_name: string
}

export async function fetchAdminListings(): Promise<AdminListingRow[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price, platform_fee, status, is_featured, created_at, seller_id')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const rows = (data as Omit<AdminListingRow, 'seller_name'>[]) || []
  const ids = [...new Set(rows.map((r) => r.seller_id))]
  const { data: people } = ids.length
    ? await supabase.from('public_profiles').select('id, name').in('id', ids)
    : { data: [] }
  const nameById = new Map(((people as { id: string; name: string }[]) || []).map((p) => [p.id, p.name]))
  return rows.map((r) => ({ ...r, platform_fee: Number(r.platform_fee || 0), seller_name: nameById.get(r.seller_id) || 'Student' }))
}

// Hide a bad listing (or put it back). 'removed' keeps the row + photos with
// the seller so nothing is lost if it was a mistake.
export async function adminSetListingStatus(id: string, status: 'active' | 'removed'): Promise<void> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminSetFeatured(id: string, on: boolean): Promise<void> {
  const { error } = await supabase.from('listings').update({ is_featured: on }).eq('id', id)
  if (error) throw error
}

export interface AdminMemberRow {
  id: string
  name: string
  email: string | null
  building: string | null
  verification_status: string
  role: string
  created_at: string
}

export async function fetchAdminMembers(): Promise<AdminMemberRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, building, verification_status, role, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as AdminMemberRow[]) || []
}

// The privileged-columns trigger allows this write only for admins.
export async function adminSetVerification(id: string, status: 'verified' | 'pending'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ verification_status: status }).eq('id', id)
  if (error) throw error
}

// ---- reports (the reports table + RLS shipped in 0001: users insert their
// own, admins read all and update status) -----------------------------------

export type ReportTargetType = 'listing' | 'user'

export async function createReport(targetType: ReportTargetType, targetId: string, reason: string, note: string): Promise<void> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: note.trim() ? `${reason} — ${note.trim()}` : reason,
  })
  if (error) throw error
}

export interface AdminReportRow {
  id: string
  target_type: ReportTargetType | 'message'
  target_id: string
  reason: string
  status: 'open' | 'reviewed' | 'resolved'
  created_at: string
  reporter_name: string
  target_label: string // listing title or member name
  target_active: boolean // listing still active (so "Remove" makes sense)
}

export async function fetchAdminReports(): Promise<AdminReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, status, created_at, reporter_id')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  const rows = (data as { id: string; target_type: AdminReportRow['target_type']; target_id: string; reason: string; status: AdminReportRow['status']; created_at: string; reporter_id: string | null }[]) || []
  const listingIds = rows.filter((r) => r.target_type === 'listing').map((r) => r.target_id)
  const personIds = [
    ...rows.filter((r) => r.target_type === 'user').map((r) => r.target_id),
    ...rows.map((r) => r.reporter_id).filter(Boolean) as string[],
  ]
  const [{ data: listings }, { data: people }] = await Promise.all([
    listingIds.length
      ? supabase.from('listings').select('id, title, status').in('id', [...new Set(listingIds)])
      : Promise.resolve({ data: [] as { id: string; title: string; status: string }[] }),
    personIds.length
      ? supabase.from('public_profiles').select('id, name').in('id', [...new Set(personIds)])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const listingById = new Map(((listings as { id: string; title: string; status: string }[]) || []).map((l) => [l.id, l]))
  const nameById = new Map(((people as { id: string; name: string }[]) || []).map((p) => [p.id, p.name]))
  return rows.map((r) => {
    const listing = r.target_type === 'listing' ? listingById.get(r.target_id) : undefined
    return {
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      reporter_name: (r.reporter_id && nameById.get(r.reporter_id)) || 'A member',
      target_label: r.target_type === 'listing' ? listing?.title || '(listing deleted)' : nameById.get(r.target_id) || '(member gone)',
      target_active: r.target_type === 'listing' ? listing?.status === 'active' : true,
    }
  })
}

// 'resolved' = handled (e.g. listing removed) · 'reviewed' = dismissed as fine
export async function adminSetReportStatus(id: string, status: 'resolved' | 'reviewed'): Promise<void> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', id)
  if (error) throw error
}

// Open-report count for the sidebar badge. Errors (non-admin) collapse to 0.
export async function countOpenReports(): Promise<number> {
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
  if (error) return 0
  return count || 0
}
