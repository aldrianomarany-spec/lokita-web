// Data-access layer: real Supabase queries + mappers between the DB row shapes
// and the UI display shape the marketplace components already use.
import { supabase } from './supabase'
import { assertClean } from './moderation'
import { compressImage, makeThumb } from './img'
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
    major: db.major || '',
    since: memberSince(db.created_at),
    verification_status: db.verification_status,
    profile_photo_url: db.profile_photo_url,
    role: db.role,
    banned: db.is_banned,
  }
}

// UI edit buffer (pf) → DB update columns.
// building/floor are only written when their labels map cleanly to codes —
// NEVER silently nulled. A label mismatch once wiped a member's floor, which
// made isProfileComplete() false and bounced them back to onboarding.
export function uiEditsToDb(pf: UiProfile): Partial<DbProfile> {
  const digits = (pf.batch || '').replace(/[^0-9]/g, '')
  const out: Partial<DbProfile> = {
    name: pf.name.trim(),
    student_id_number: pf.studentId.trim() || null,
    whatsapp_number: pf.whatsapp.trim() || null,
    room_number: pf.room.trim() || null,
    batch_year: digits ? Number(digits) : null,
    class_standing: (pf.standing ? pf.standing.toLowerCase() : null) as DbProfile['class_standing'],
    major: pf.major?.trim() || null,
  }
  const bCode = pf.building ? BUILDING_CODE[pf.building] : undefined
  if (bCode) {
    out.building = bCode
    const fCode = pf.floor ? floorCodeFor(pf.building, pf.floor) : null
    if (fCode) out.floor = fCode as DbProfile['floor']
    // unmapped/blank floor → leave the stored floor untouched
  }
  return out
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
export async function uploadAvatar(rawFile: File): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const file = await compressImage(rawFile)
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
  is_giveaway?: boolean // Free & Donations corner (0029)
  view_count?: number // how many non-owners opened it (0029)
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
// Only count saves whose listing is still ACTIVE — sold/removed/deleted items
// used to keep the ⭐ badge lit while the wishlist page showed nothing.
// Stale rows are pruned in the background to keep the table lean.
export async function fetchWishlistIds(): Promise<string[]> {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('wishlist')
    .select('listing_id, listing:listing_id(status)')
    .eq('user_id', user.id)
  if (error) throw error
  const rows = (data as unknown as { listing_id: string; listing: { status: string } | null }[]) || []
  const stale = rows.filter((r) => !r.listing || r.listing.status !== 'active').map((r) => r.listing_id)
  if (stale.length) {
    supabase.from('wishlist').delete().eq('user_id', user.id).in('listing_id', stale).then(() => {})
  }
  return rows.filter((r) => r.listing && r.listing.status === 'active').map((r) => r.listing_id)
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
    .filter((l): l is DbListing & { listing_photos: { photo_url: string; sort_order: number }[] } => !!l && l.status === 'active')
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
  role?: string
  last_seen_at?: string | null
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
    sellerRole: seller?.role || 'user',
    ownerId: r.seller_id,
    isGiveaway: !!r.is_giveaway,
    viewCount: r.view_count ?? 0,
  }
}

export interface FeedOpts {
  cat?: string
  cond?: string
  sort?: 'Nearest' | 'Newest' | 'Price'
  query?: string
  building?: string // display label (e.g. "Thomas Building") or "All"
  free?: boolean // Free & Donations corner: giveaways only
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
  if (opts.free) q = q.eq('is_giveaway', true)
  if (opts.query && opts.query.trim()) {
    // match title OR description; strip PostgREST or() delimiters from input
    const term = opts.query.trim().replace(/[,()]/g, ' ').trim()
    if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
  }
  q = q.order('is_featured', { ascending: false })
  q = opts.sort === 'Price' ? q.order('price', { ascending: true }) : q.order('created_at', { ascending: false })
  q = q.limit(24)
  const { data, error } = await q
  if (error) throw error
  const rows = (data as FeedRow[]) || []
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))]
  const { data: people } = sellerIds.length
    ? await supabase.from('public_profiles').select('id, name, profile_photo_url, verification_status, role, last_seen_at').in('id', sellerIds)
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
  isGiveaway?: boolean // Free & Donations: price published as Rp 0, no fee
}

// Insert a listing owned by the current user, then upload its photos.
// `priceNum` is the seller's asking price — the apply_platform_fee trigger
// (migration 0017) sets platform_fee and publishes at ask + fee, so the fee
// can't be dodged by a modified client.
export async function createListing(input: NewListing, photos: File[]): Promise<string> {
  assertClean(input.title, input.description)
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
      is_giveaway: !!input.isGiveaway,
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw error
  const id = (data as { id: string }).id
  for (let i = 0; i < photos.length; i++) {
    const f = await compressImage(photos[i])
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${id}/${i}.${ext}`
    const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, f, { upsert: true })
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('listing-photos').getPublicUrl(path)
    const { error: insErr } = await supabase.from('listing_photos').insert({ listing_id: id, photo_url: pub.publicUrl, sort_order: i })
    if (insErr) throw insErr
    // feed thumbnail rides alongside (best-effort — the grid falls back to the
    // full image when a thumb is missing, e.g. for older listings)
    const thumb = await makeThumb(f)
    if (thumb) await supabase.storage.from('listing-photos').upload(`${user.id}/${id}/thumb_${i}.jpg`, thumb, { upsert: true }).catch(() => {})
  }
  return id
}

// URL of the small feed thumbnail for a full listing photo (upload convention:
// "<uid>/<listing>/3.jpg" → "<uid>/<listing>/thumb_3.jpg"). Callers must keep
// the original as an onError fallback — pre-thumbnail listings have none.
export function thumbUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null
  const m = photoUrl.match(/^(.*\/)(\d+)\.[a-zA-Z0-9]+$/)
  return m ? `${m[1]}thumb_${m[2]}.jpg` : null
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
  protection_enabled?: boolean
  protection_fee?: number
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
      // opt-in Buyer Protection (0028) — informational until a gateway exists
      protection_enabled: !!o.protection_enabled,
      protection_fee: o.protection_enabled ? o.protection_fee || 0 : 0,
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
  protection_enabled?: boolean
  protection_fee?: number
  pickup_code?: string // 6-char handover code both parties see (0029)
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
  other_role: string
  other_last_seen: string | null
  i_am_seller: boolean // which side of the trade the viewer is on (picks quick replies)
  conv_ids: string[] // every conversation merged into this thread (one thread per person)
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
    ? await supabase.from('public_profiles').select('id, name, profile_photo_url, verification_status, role, last_seen_at').in('id', otherIds)
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
      other_role: other?.role || 'user',
      other_last_seen: other?.last_seen_at ?? null,
      i_am_seller: r.seller_id === uid,
      conv_ids: [r.id],
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
  // ONE thread per person (marketplace-app style): merge every conversation
  // with the same counterparty. Newest-first, so the representative row keeps
  // the freshest message; product context falls back to the newest
  // conversation in the group that has a listing attached.
  const grouped: ConversationRow[] = []
  const byOther = new Map<string, ConversationRow>()
  for (const c of result) {
    const g = byOther.get(c.other_id)
    if (!g) {
      byOther.set(c.other_id, c)
      grouped.push(c)
    } else {
      g.conv_ids.push(c.id)
      g.unread += c.unread
      if (!g.item_title && c.item_title) {
        g.listing_id = c.listing_id
        g.item_title = c.item_title
        g.item_price = c.item_price
        g.item_photo = c.item_photo
        g.item_status = c.item_status
      }
    }
  }
  return grouped
}

export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  // product-card attachment (messages.listing_id, migration 0025)
  listing_id?: string | null
  image_url?: string | null // photo message (migration 0028)
  item_title?: string | null
  item_price?: number | null
  item_photo?: string | null
}

type MsgJoinRow = MessageRow & { listing?: { title: string; price: number; listing_photos: { photo_url: string; sort_order: number }[] | null } | null }

// one thread per person = messages from every conversation in the group
export async function fetchMessages(conversationIds: string[]): Promise<MessageRow[]> {
  if (!conversationIds.length) return []
  let res = await supabase
    .from('messages')
    .select('*, listing:listing_id(title, price, listing_photos(photo_url, sort_order))')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true })
  if (res.error) {
    // graceful before migration 0025 (no listing_id column yet)
    res = await supabase.from('messages').select('*').in('conversation_id', conversationIds).order('created_at', { ascending: true })
    if (res.error) throw res.error
  }
  return ((res.data as MsgJoinRow[]) || []).map((r) => ({
    ...r,
    item_title: r.listing?.title ?? null,
    item_price: r.listing?.price ?? null,
    item_photo: firstPhoto(r.listing?.listing_photos),
    listing: undefined,
  }))
}

// buyer messaging a seller about a listing — reuse the existing thread if any
export async function getOrCreateConversation(listingId: string, sellerId: string): Promise<string> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  if (sellerId === uid) throw new Error("That's your own listing.")
  // one thread per person: reuse ANY conversation between this pair,
  // regardless of listing — the product context rides on each message
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(buyer_id.eq.${uid},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${uid})`)
    .order('created_at', { ascending: false })
    .limit(1)
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

// chat photo → public listing-photos bucket under <uid>/chat/ (owner-folder RLS)
export async function uploadChatImage(rawFile: File): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const file = await compressImage(rawFile)
  const path = `${user.id}/chat/${Date.now()}.jpg`
  const { error } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
}

export async function sendMessage(conversationId: string, content: string, listingId?: string | null, imageUrl?: string | null): Promise<void> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  const trimmed = content.trim()
  if (!trimmed && !imageUrl) return
  assertClean(trimmed)
  const row: Record<string, unknown> = { conversation_id: conversationId, sender_id: uid, content: trimmed || '📷' }
  if (listingId) row.listing_id = listingId
  if (imageUrl) row.image_url = imageUrl
  let { error } = await supabase.from('messages').insert(row)
  if (error && listingId) {
    // pre-0025 fallback: send without the product attachment
    ;({ error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: uid, content: trimmed }))
  }
  if (error) throw error
}

// delete a whole thread (all conversations with that person) — for both sides
export async function deleteConversation(conversationIds: string[]): Promise<void> {
  if (!conversationIds.length) return
  const { error } = await supabase.from('conversations').delete().in('id', conversationIds)
  if (error) throw error
}

export async function markConversationRead(conversationIds: string[]): Promise<void> {
  const uid = await getUserId()
  if (!uid || !conversationIds.length) return
  await supabase.from('messages').update({ is_read: true }).in('conversation_id', conversationIds).neq('sender_id', uid).eq('is_read', false)
}

// public credibility counter (SECURITY DEFINER aggregate, migration 0025);
// null before the migration runs — the UI hides the row
export async function fetchMarketStats(): Promise<{ completed_trades: number } | null> {
  try {
    const { data, error } = await supabase.rpc('market_stats')
    if (error) return null
    return data as { completed_trades: number }
  } catch {
    return null
  }
}

// lean rows for the Control Room analytics charts (admin RLS covers this)
export interface AdminTrendRow {
  created_at: string
  updated_at: string | null
  status: string
  platform_fee: number | null
}
export async function fetchAdminTrends(): Promise<AdminTrendRow[]> {
  const { data, error } = await supabase.from('listings').select('created_at, updated_at, status, platform_fee').limit(2000)
  if (error) throw error
  return (data as AdminTrendRow[]) || []
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
    .select('id, name, profile_photo_url, verification_status, role, last_seen_at')
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
  assertClean(input.title, input.description)
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
  role: string
  last_seen_at: string | null
  since: string
}

export async function fetchMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, name, profile_photo_url, building, verification_status, role, last_seen_at, created_at')
    .order('name', { ascending: true })
    .limit(200)
  if (error) throw error
  const rows = (data as { id: string; name: string; profile_photo_url: string | null; building: string | null; verification_status: string; role: string | null; last_seen_at: string | null; created_at: string }[]) || []
  return rows.map((r) => ({
    id: r.id,
    name: r.name || 'Student',
    photo: r.profile_photo_url,
    building: r.building ? BUILDING_LABEL[r.building] || '' : '',
    verified: r.verification_status === 'verified',
    role: r.role || 'user',
    last_seen_at: r.last_seen_at,
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
  major: string
  verified: boolean
  role: string
  last_seen_at: string | null
  since: string
}

export async function fetchMemberProfile(id: string): Promise<MemberProfileInfo | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, name, profile_photo_url, building, floor, batch_year, class_standing, major, verification_status, role, last_seen_at, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as { id: string; name: string; profile_photo_url: string | null; building: string | null; floor: string | null; batch_year: number | null; class_standing: string | null; major: string | null; verification_status: string; role: string | null; last_seen_at: string | null; created_at: string }
  return {
    id: r.id,
    name: r.name || 'Student',
    photo: r.profile_photo_url,
    building: r.building ? BUILDING_LABEL[r.building] || '' : '',
    floor: r.floor ? FLOOR_LABEL[r.floor] || '' : '',
    batch: r.batch_year ? `Class of ${r.batch_year}` : '',
    standing: r.class_standing ? STANDING_LABEL[r.class_standing] || '' : '',
    major: r.major || '',
    verified: r.verification_status === 'verified',
    role: r.role || 'user',
    last_seen_at: r.last_seen_at,
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
    supabase.from('public_profiles').select('id, name, profile_photo_url, verification_status, role, last_seen_at').eq('id', id).maybeSingle(),
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
    .select('id, name, profile_photo_url, verification_status, role, last_seen_at')
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
  logAdmin(status === 'removed' ? 'listing_removed' : 'listing_restored', id)
}

export async function adminSetFeatured(id: string, on: boolean): Promise<void> {
  const { error } = await supabase.from('listings').update({ is_featured: on }).eq('id', id)
  if (error) throw error
}

export interface AdminMemberRow {
  id: string
  name: string
  profile_photo_url: string | null
  email: string | null
  building: string | null
  verification_status: string
  verification_doc_url: string | null // storage path of the uploaded student ID (private bucket)
  role: string
  is_banned: boolean
  created_at: string
}

export async function fetchAdminMembers(): Promise<AdminMemberRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, profile_photo_url, email, building, verification_status, verification_doc_url, role, is_banned, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as AdminMemberRow[]) || []
}

// The privileged-columns trigger allows this write only for admins.
// Approve → 'verified', reject → 'rejected' (member can re-upload), reset → 'pending'.
export async function adminSetVerification(id: string, status: 'verified' | 'pending' | 'rejected'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ verification_status: status }).eq('id', id)
  if (error) throw error
  logAdmin('verification_' + status, id)
}

// Permanently delete a member account (migration 0024). SECURITY DEFINER
// function guards: admins only, no self-delete, admins can't delete admins.
// Cascades wipe the profile + their listings; trade history keeps nulled rows.
export async function adminDeleteUser(id: string): Promise<void> {
  logAdmin('account_deleted', id) // log first — the target row is about to vanish
  const { error } = await supabase.rpc('admin_delete_user', { target: id })
  if (error) throw error
}

// Ban/unban (admin-only via RLS + trigger). Banned accounts can browse but
// restrictive policies (migration 0019) block every new insert they try.
export async function adminSetBanned(id: string, banned: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_banned: banned }).eq('id', id)
  if (error) throw error
  logAdmin(banned ? 'member_banned' : 'member_unbanned', id)
}

// Cancel overdue orders (pending >48h, paid past drop-off deadline) so items
// don't stay reserved forever. Fire-and-forget on app start; the DB function
// (migration 0019) is idempotent and safe for any signed-in caller.
// ---- featured boosts (migration 0027) ----
export const BOOST_OPTIONS: { days: 3 | 7; amount: number }[] = [
  { days: 3, amount: 3000 },
  { days: 7, amount: 5000 },
]

export async function requestBoost(listingId: string, days: 3 | 7): Promise<void> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  const amount = BOOST_OPTIONS.find((o) => o.days === days)?.amount ?? 3000
  const { error } = await supabase.from('boost_requests').insert({ listing_id: listingId, seller_id: uid, days, amount })
  if (error) throw error
}

export interface BoostRow {
  id: string
  listing_id: string
  seller_id: string
  days: number
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  listing_title: string
  seller_name: string
}

export async function fetchAdminBoosts(): Promise<BoostRow[]> {
  const { data, error } = await supabase
    .from('boost_requests')
    .select('*, listing:listing_id(title), seller:seller_id(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  type Row = Omit<BoostRow, 'listing_title' | 'seller_name'> & { listing: { title: string } | null; seller: { name: string } | null }
  return ((data as Row[]) || []).map((r) => ({
    ...r,
    listing_title: r.listing?.title || '(deleted listing)',
    seller_name: r.seller?.name || 'Student',
  }))
}

export async function adminResolveBoost(b: BoostRow, approve: boolean): Promise<void> {
  if (approve) {
    const until = new Date(Date.now() + b.days * 86400000).toISOString()
    const { error } = await supabase.from('listings').update({ is_featured: true, featured_until: until }).eq('id', b.listing_id)
    if (error) throw error
  }
  const { error } = await supabase.from('boost_requests').update({ status: approve ? 'approved' : 'rejected' }).eq('id', b.id)
  if (error) throw error
  logAdmin(approve ? 'boost_approved' : 'boost_rejected', b.listing_id, `${b.days}d · ${b.listing_title}`)
}

// clear expired FEATURED windows (0027) — app-start sweep, safe pre-migration
export async function expireFeatured(): Promise<void> {
  await supabase.rpc('expire_featured').then(() => {}, () => {})
}

// the caller's active listings — used to auto-attach an item when answering
// a request ("I have this 💬")
export interface MyListingLite {
  id: string
  title: string
  price: number
  category: string | null
  photo: string | null
}
export async function fetchMyActiveListings(): Promise<MyListingLite[]> {
  const uid = await getUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price, category, listing_photos(photo_url, sort_order)')
    .eq('seller_id', uid)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return []
  type Row = { id: string; title: string; price: number; category: string | null; listing_photos: { photo_url: string; sort_order: number }[] | null }
  return ((data as Row[]) || []).map((r) => ({ id: r.id, title: r.title, price: r.price, category: r.category, photo: firstPhoto(r.listing_photos) }))
}

// presence heartbeat — powers "last seen Xh ago" on People (migration 0028)
export async function touchLastSeen(): Promise<void> {
  const uid = await getUserId()
  if (!uid) return
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', uid).then(() => {}, () => {})
}

export async function expireStaleOrders(): Promise<void> {
  await supabase.rpc('expire_stale_orders')
}

// DB self-cleaning (migration 0020): prunes stale wishlist rows and old
// notifications for EVERYONE. Fire-and-forget on app start.
export async function cleanupStaleData(): Promise<void> {
  await supabase.rpc('cleanup_stale_data')
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

// ---- promotion banners (migration 0021) — admin-written homepage carousel --

export interface BannerRow {
  id: string
  title: string
  subtitle: string | null
  cta_label: string | null
  image_url: string | null
  target_type: 'category' | 'listing' | 'requests' | 'sell' | 'none'
  target_value: string | null
  placement?: 'hero' | 'ticker' // pre-0023 rows have none -> treated as hero
  sort: number
  is_active: boolean
  created_at: string
}

// active banners for the homepage (guests included — RLS filters to active)
export async function fetchBanners(): Promise<BannerRow[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) return [] // table not migrated yet → carousel just falls back
  return ((data as BannerRow[]) || []).filter((b) => b.is_active)
}

export async function fetchAdminBanners(): Promise<BannerRow[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as BannerRow[]) || []
}

// Banner photo -> public bucket, under the admin's own folder (storage RLS
// allows owner-folder writes; the bucket is public-read).
export async function uploadBannerImage(rawFile: File): Promise<string> {
  const user = await getUser()
  if (!user) throw new Error('Not signed in')
  const file = await compressImage(rawFile)
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}/banners/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
}

export async function adminCreateBanner(b: Pick<BannerRow, 'title' | 'subtitle' | 'cta_label' | 'target_type' | 'target_value'> & { image_url?: string | null; placement?: 'hero' | 'ticker' }): Promise<void> {
  const { error } = await supabase.from('banners').insert(b)
  if (error) throw error
}

export async function adminSetBannerActive(id: string, on: boolean): Promise<void> {
  const { error } = await supabase.from('banners').update({ is_active: on }).eq('id', id)
  if (error) throw error
}

export async function adminDeleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw error
}

// realtime: homepage carousels update the moment the admin publishes
// ---- site settings (admin-tunable knobs; migration 0026) ----
export interface TickerSettings {
  speed: 'slow' | 'normal' | 'fast'
  clickable: boolean
}
const TICKER_DEFAULTS: TickerSettings = { speed: 'normal', clickable: true }

export async function fetchTickerSettings(): Promise<TickerSettings> {
  try {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'ticker').maybeSingle()
    if (error || !data) return TICKER_DEFAULTS
    const v = (data as { value: Partial<TickerSettings> }).value || {}
    return {
      speed: v.speed === 'slow' || v.speed === 'fast' ? v.speed : 'normal',
      clickable: v.clickable !== false,
    }
  } catch {
    return TICKER_DEFAULTS
  }
}

export async function adminSetTickerSettings(v: TickerSettings): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert({ key: 'ticker', value: v, updated_at: new Date().toISOString() })
  if (error) throw error
}

export function subscribeSettings(onChange: () => void): () => void {
  // unique topic per subscriber (same rule as subscribeBanners)
  const ch = supabase
    .channel('settings-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}

export function subscribeBanners(onChange: () => void): () => void {
  // unique topic per subscriber — the Ticker and the homepage hero both
  // listen, and Supabase throws if two callers attach callbacks to the
  // same channel topic after it has subscribed
  const ch = supabase
    .channel('banners-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}

// ===========================================================================
// 0029 batch — growth + hardening data layer
// ===========================================================================

// ---- view counts (owner-only display; DB ignores the owner's own opens) ----
export function incrementView(listingId: string): void {
  supabase.rpc('increment_view', { p_listing: listingId }).then(() => {}, () => {})
}

// ---- saved-search alerts ---------------------------------------------------
export interface SearchAlertRow {
  id: string
  query: string
  created_at: string
}

export async function fetchMyAlerts(): Promise<SearchAlertRow[]> {
  const { data, error } = await supabase.from('search_alerts').select('id, query, created_at').order('created_at', { ascending: false })
  if (error) return []
  return (data as SearchAlertRow[]) || []
}

export async function createSearchAlert(query: string): Promise<void> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  const q = query.trim().toLowerCase().slice(0, 60)
  if (q.length < 2) throw new Error('Alert needs at least 2 characters.')
  const { error } = await supabase.from('search_alerts').insert({ user_id: uid, query: q })
  if (error && !`${error.message}`.includes('duplicate')) throw error
}

export async function deleteSearchAlert(id: string): Promise<void> {
  const { error } = await supabase.from('search_alerts').delete().eq('id', id)
  if (error) throw error
}

// ---- blocks ----------------------------------------------------------------
export async function fetchMyBlockedIds(): Promise<string[]> {
  const { data, error } = await supabase.from('blocks').select('blocked_id')
  if (error) return []
  return ((data as { blocked_id: string }[]) || []).map((r) => r.blocked_id)
}

export async function blockUser(id: string): Promise<void> {
  const uid = await getUserId()
  if (!uid) throw new Error('Not signed in')
  const { error } = await supabase.from('blocks').insert({ blocker_id: uid, blocked_id: id })
  if (error && !`${error.message}`.includes('duplicate')) throw error
}

export async function unblockUser(id: string): Promise<void> {
  const uid = await getUserId()
  if (!uid) return
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', id)
  if (error) throw error
}

// ---- admin audit trail ------------------------------------------------------
// Best-effort: an audit hiccup must never break the admin action itself.
export function logAdmin(action: string, target?: string | null, detail?: string | null): void {
  getUserId().then((uid) => {
    if (!uid) return
    supabase
      .from('admin_audit')
      .insert({ admin_id: uid, action, target: target || null, detail: detail || null })
      .then(() => {}, () => {})
  })
}

export interface AuditRow {
  id: string
  admin_id: string | null
  action: string
  target: string | null
  detail: string | null
  created_at: string
}

export async function fetchAdminAudit(): Promise<AuditRow[]> {
  const { data, error } = await supabase.from('admin_audit').select('*').order('created_at', { ascending: false }).limit(60)
  if (error) return []
  return (data as AuditRow[]) || []
}

// ---- admin broadcast --------------------------------------------------------
export async function adminBroadcast(title: string, body: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_broadcast', { p_title: title.trim(), p_body: body.trim() })
  if (error) throw error
  return (data as number) ?? 0
}

// ---- client error reports (in-house monitoring) -----------------------------
export interface ClientErrorRow {
  id: string
  user_id: string | null
  message: string
  source: string | null
  ua: string | null
  created_at: string
}

export async function fetchClientErrors(): Promise<ClientErrorRow[]> {
  const { data, error } = await supabase
    .from('client_errors')
    .select('id, user_id, message, source, ua, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return (data as ClientErrorRow[]) || []
}

export async function adminClearClientErrors(): Promise<void> {
  const { error } = await supabase.from('client_errors').delete().gte('created_at', '1970-01-01')
  if (error) throw error
}

// ---- moveout-season toggle (site_settings key 'moveout') --------------------
export async function fetchMoveoutActive(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'moveout').maybeSingle()
    if (error || !data) return false
    return !!((data as { value: { active?: boolean } }).value || {}).active
  } catch {
    return false
  }
}

export async function adminSetMoveoutActive(on: boolean): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert({ key: 'moveout', value: { active: on }, updated_at: new Date().toISOString() })
  if (error) throw error
  logAdmin('moveout', null, on ? 'season ON' : 'season OFF')
}
