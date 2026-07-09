import type {
  Chat,
  Notif,
  Review,
  SellerReview,
  Profile,
} from './types'

// NOTE: the live listings feed now comes from Supabase (see src/lib/api.ts).
// The mock ITEMS / FLOOR_BY_ID / WA_BY_SELLER were removed in Section 2.
// The data below (chats, notifs, reviews, seller reviews) is still sample
// content for the Messages / Notifications / seller-profile screens until
// those sections are wired.

// ---------- conversations ----------
export const CHATS: Chat[] = [
  {
    id: 1, name: 'Bimo S.', initial: 'B', tone: 'haze', item: 'Mini Fridge 50L', last: 'Sure, I can drop it today 👍', ago: 'now', unread: true,
    thread: [
      { who: 'them', text: 'Hi! Is the mini fridge still available?' },
      { who: 'me', text: 'Yes it is — like new, barely used.' },
      { who: 'them', text: 'Great, can you drop it at the Security Post?' },
      { who: 'me', text: 'Sure, I can drop it today 👍' },
    ],
  },
  {
    id: 2, name: 'Dewi R.', initial: 'D', tone: 'clay', item: 'LED Desk Lamp', last: 'Paid! Picking up after class.', ago: '1h', unread: true,
    thread: [
      { who: 'me', text: 'Lamp is at the Thomas House post now.' },
      { who: 'them', text: 'Paid! Picking up after class.' },
    ],
  },
  {
    id: 3, name: 'Eka W.', initial: 'E', tone: 'blush', item: 'Textbook bundle', last: 'Is a small discount possible?', ago: '3h', unread: false,
    thread: [
      { who: 'them', text: 'Hi, interested in the textbooks.' },
      { who: 'them', text: 'Is a small discount possible?' },
    ],
  },
]

// ---------- notifications ----------
export const NOTIFS: Notif[] = [
  { id: 1, type: 'message', title: 'New message from Bimo S.', body: '“Sure, I can drop it today 👍”', ago: '2m', unread: true, chatId: 1 },
  { id: 2, type: 'item', title: 'Question on your Study Desk + Chair', body: 'Rani M. asked: “Is the chair height adjustable?”', ago: '25m', unread: true, itemId: 1 },
  { id: 3, type: 'order', title: 'Item sold — LED Desk Lamp', body: 'Dewi R. paid Rp 45.000. Drop it at the Thomas Building Security Post.', ago: '1h', unread: true, itemId: 5 },
  { id: 4, type: 'price', title: 'Price drop on a saved item', body: 'Mini Fridge 50L is now Rp 350.000 — down from Rp 420.000.', ago: '3h', unread: false, itemId: 2 },
  { id: 5, type: 'order', title: 'Pickup confirmed', body: 'Your Calculus + Physics Textbooks were collected. Funds released to your balance.', ago: '1d', unread: false, itemId: 6 },
  { id: 6, type: 'item', title: 'Your JIU Hoodie got 3 new saves', body: 'Interest is heating up — reply fast to close the deal.', ago: '1d', unread: false, itemId: 7 },
  { id: 7, type: 'system', title: 'Lokita is now dorm-wide', body: 'The new “Others” category is live, plus faster Security Post pickups.', ago: '2d', unread: false },
]

// ---------- reviews on Aldriano's own profile ----------
export const REVIEWS: Review[] = [
  { id: 1, name: 'Bimo S.', initial: 'B', tone: 'haze', role: 'buyer', item: 'Mini Fridge 50L', stars: 5, ago: '2 weeks ago', text: 'Super smooth trade. The fridge was exactly as described and the Security Post drop-off made pickup effortless.' },
  { id: 2, name: 'Dewi R.', initial: 'D', tone: 'clay', role: 'buyer', item: 'LED Desk Lamp', stars: 5, ago: '1 month ago', text: 'Quick to reply and a fair price. Everything was clean and packed well — would happily buy from Aldriano again.' },
  { id: 3, name: 'Eka W.', initial: 'E', tone: 'blush', role: 'seller', item: 'Calculus Textbooks', stars: 4, ago: '1 month ago', text: 'Paid on time and picked up promptly. Friendly, reliable neighbour — an easy trade all round.' },
]

// ---------- pre-seeded public reviews per seller (seller-profile modal) ----------
export const SELLER_REVIEWS: Record<string, SellerReview[]> = {
  'Bimo S.': [{ by: 'Rani M.', initial: 'R', tone: 'sage', stars: 5, ago: '1 week ago', item: 'Mini Fridge 50L', text: 'Fridge works perfectly and Bimo replied within minutes. Smooth drop-off at the Security Post.' }],
  'Citra D.': [{ by: 'Hana P.', initial: 'H', tone: 'blush', stars: 4, ago: '3 weeks ago', item: 'Standing Fan', text: 'A little worn but works great, and a fair price. Easy to arrange.' }],
  'Dewi R.': [{ by: 'Gilang H.', initial: 'G', tone: 'sand', stars: 5, ago: '2 weeks ago', item: 'Batik Shirt', text: 'Exactly as described and freshly laundered. Lovely, quick trade.' }],
  'Eka W.': [{ by: 'Fajar N.', initial: 'F', tone: 'haze', stars: 4, ago: '1 month ago', item: 'Statistics Textbook', text: 'Good condition, minimal notes. Reliable and friendly neighbour.' }],
}

// items shown as SOLD in the profile "My listings" grid
export const SOLD_ITEMS = [
  { title: 'Ceramic Mug Set (4)', price: 'Rp 40.000', tone: 'clay' as const, photo: 'mug set' },
  { title: 'Foldable Clothes Rack', price: 'Rp 65.000', tone: 'sand' as const, photo: 'clothes rack' },
]

export const DEFAULT_PROFILE: Profile = {
  name: 'Aldriano',
  studentId: 'JIU-2021-04821',
  whatsapp: '+62 812-3456-7890',
  building: 'Thomas Building',
  room: 'T-108',
  floor: 'T1',
  batch: 'Class of 2027',
  standing: 'Junior',
  since: 'March 2024',
}
