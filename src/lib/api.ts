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
  price: number
  category: string | null
  condition: string | null
  is_graduation_bundle: boolean
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

// ===========================================================================
// ORDERS / TRANSACTIONS (Section 3) — real lifecycle: paid → dropped_off →
// completed (+ cancelled). Deadlines generated here; a DB trigger reserves the
// listing on order and frees it on cancel.
// ===========================================================================
export type OrderStatus = 'paid' | 'dropped_off' | 'completed' | 'cancelled'
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
  const now = Date.now()
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      listing_id: o.listingId,
      buyer_id: user.id,
      seller_id: o.sellerId,
      payment_method: o.payment_method,
      payment_status: o.payment_method === 'qris' ? 'paid' : 'pending',
      pickup_method: o.pickup_method,
      status: 'paid',
      paid_at: o.payment_method === 'qris' ? new Date(now).toISOString() : null,
      dropoff_deadline: new Date(now + 2 * DAY).toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
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
  item_title: string
}

export async function fetchConversations(): Promise<ConversationRow[]> {
  const uid = await getUserId()
  if (!uid) return []
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*, listing:listing_id(title)')
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
  if (error) throw error
  const rows = (convs as (Record<string, unknown> & { id: string; buyer_id: string; seller_id: string; listing_id: string | null; created_at: string; listing: { title: string } | null })[]) || []
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
      item_title: r.listing?.title || 'a listing',
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

export function subscribeNotifications(userId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel('notifs-' + userId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(ch)
  }
}
