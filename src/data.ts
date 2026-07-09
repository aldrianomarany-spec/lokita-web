import type {
  Item,
  Chat,
  Notif,
  Review,
  SellerReview,
  Profile,
} from './types'

// ---------- listings ----------
export const ITEMS: Item[] = [
  { id: 1, title: 'Study Desk + Chair', price: 'Rp 180.000', priceNum: 180000, wasPrice: 'Rp 250.000', dorm: 'Thomas House', building: 'Thomas House', distance: 'Your building', cond: 'Good', cat: 'Furniture', rating: '4.9', trades: 12, seller: 'Aldriano', sellerInitial: 'A', photo: 'desk + chair', tone: 'sand', mine: true, tag: 'BUNDLE-READY', hot: false, new: false, order: 3, desc: 'Sturdy wooden study desk with a matching chair. Barely used — selling because I graduate this term. Fits standard dorm rooms perfectly.' },
  { id: 2, title: 'Mini Fridge 50L', price: 'Rp 350.000', priceNum: 350000, dorm: 'Union Building', building: 'Union Building', distance: '320 m · 4 min', cond: 'Like new', cat: 'Appliances', rating: '5.0', trades: 8, seller: 'Bimo S.', sellerInitial: 'B', photo: 'mini fridge', tone: 'haze', tag: 'HOT', hot: true, new: false, order: 6, desc: 'Compact 50L fridge, super quiet, keeps drinks cold. Perfect for late-night study snacks. Clean and fully working.' },
  { id: 3, title: 'Whole Room — Graduation Bundle', price: 'Rp 1.200.000', priceNum: 1200000, wasPrice: 'Rp 1.600.000', dorm: 'Thomas House', building: 'Thomas House', distance: 'Your building', cond: 'Good', cat: 'Bundles', rating: '4.9', trades: 12, seller: 'Aldriano', sellerInitial: 'A', photo: 'bed · fan · desk · shelf', tone: 'olive', mine: true, tag: 'GRAD BUNDLE', hot: false, new: false, order: 5, desc: 'Everything in my room in one deal: single bed, standing fan, desk, chair and a shelf. Move-in ready for the next student. Grab it all and save big.' },
  { id: 4, title: 'Standing Fan (3-speed)', price: 'Rp 90.000', priceNum: 90000, dorm: 'Union Building', building: 'Union Building', distance: '410 m · 5 min', cond: 'Fair', cat: 'Appliances', rating: '4.7', trades: 5, seller: 'Citra D.', sellerInitial: 'C', photo: 'standing fan', tone: 'sage', tag: '', hot: false, new: false, order: 9, desc: 'Three-speed standing fan, works great through Cikarang heat. Small scuff on the base but runs perfectly.' },
  { id: 5, title: 'LED Desk Lamp', price: 'Rp 45.000', priceNum: 45000, dorm: 'Thomas House', building: 'Thomas House', distance: 'Same floor', cond: 'Like new', cat: 'Furniture', rating: '4.8', trades: 6, seller: 'Dewi R.', sellerInitial: 'D', photo: 'desk lamp', tone: 'clay', tag: 'NEW', hot: false, new: true, order: 1, desc: 'Warm LED desk lamp, adjustable arm, three brightness levels. Easy on the eyes for late study sessions.' },
  { id: 6, title: 'Calculus + Physics Textbooks', price: 'Rp 60.000', priceNum: 60000, wasPrice: 'Rp 210.000', dorm: 'Union Building', building: 'Union Building', distance: '300 m · 4 min', cond: 'Good', cat: 'Books', rating: '5.0', trades: 14, seller: 'Eka W.', sellerInitial: 'E', photo: 'textbook bundle', tone: 'blush', tag: '', hot: false, new: false, order: 8, desc: 'First-year Calculus and Physics textbooks, minimal highlighting. Save a fortune vs. buying new.' },
  { id: 7, title: 'JIU Hoodie — Size M', price: 'Rp 85.000', priceNum: 85000, dorm: 'Thomas House', building: 'Thomas House', distance: 'Your building', cond: 'Like new', cat: 'Clothes', rating: '4.9', trades: 12, seller: 'Aldriano', sellerInitial: 'A', photo: 'campus hoodie', tone: 'sage', mine: true, tag: '', hot: false, new: false, order: 7, desc: 'Official JIU campus hoodie, size M. Worn twice — warm and barely used. Great for cold lecture halls.' },
  { id: 8, title: 'Batik Shirt (Formal, L)', price: 'Rp 55.000', priceNum: 55000, dorm: 'Union Building', building: 'Union Building', distance: '380 m · 5 min', cond: 'Good', cat: 'Clothes', rating: '4.8', trades: 6, seller: 'Dewi R.', sellerInitial: 'D', photo: 'batik shirt', tone: 'clay', tag: '', hot: false, new: false, order: 10, desc: 'Formal batik shirt, size L. Perfect for campus presentations and formal events. Freshly laundered.' },
  { id: 9, title: 'Bluetooth Speaker', price: 'Rp 120.000', priceNum: 120000, dorm: 'Thomas House', building: 'Thomas House', distance: 'Next block · 2 min', cond: 'Like new', cat: 'Electronics', rating: '4.9', trades: 9, seller: 'Fajar N.', sellerInitial: 'F', photo: 'bt speaker', tone: 'haze', tag: 'NEW', hot: false, new: true, order: 2, desc: 'Punchy portable Bluetooth speaker, 12-hour battery. Ideal for dorm hangouts and study playlists.' },
  { id: 10, title: 'USB-C Charger 65W', price: 'Rp 70.000', priceNum: 70000, dorm: 'Union Building', building: 'Union Building', distance: '350 m · 4 min', cond: 'Like new', cat: 'Electronics', rating: '4.8', trades: 7, seller: 'Gilang H.', sellerInitial: 'G', photo: 'usb-c charger', tone: 'sand', tag: '', hot: false, new: false, order: 11, desc: 'Fast 65W USB-C charger, works with laptops and phones. Barely used spare, comes with cable.' },
  { id: 11, title: 'Rice Cooker 1.8L', price: 'Rp 110.000', priceNum: 110000, dorm: 'Union Building', building: 'Union Building', distance: '330 m · 4 min', cond: 'Good', cat: 'Appliances', rating: '4.9', trades: 10, seller: 'Hana P.', sellerInitial: 'H', photo: 'rice cooker', tone: 'blush', tag: '', hot: false, new: false, order: 12, desc: 'Reliable 1.8L rice cooker with keep-warm. Feeds a whole floor on movie night. Clean, works perfectly.' },
  { id: 12, title: 'Standing Mirror', price: 'Rp 130.000', priceNum: 130000, dorm: 'Thomas House', building: 'Thomas House', distance: 'Your building', cond: 'Good', cat: 'Furniture', rating: '4.7', trades: 4, seller: 'Indah K.', sellerInitial: 'I', photo: 'standing mirror', tone: 'olive', tag: '', hot: false, new: false, order: 4, desc: 'Full-length standing mirror with a light wooden frame. A couple of tiny edge marks, glass is flawless.' },
]

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

// ---------- proximity: which floor each listing lives on ----------
export const FLOOR_BY_ID: Record<number, string> = {
  1: 'T1', 2: 'U2', 3: 'T1', 4: 'U3', 5: 'Ground', 6: 'U2',
  7: 'T2', 8: 'U3', 9: 'T3', 10: 'U2', 11: 'U3', 12: 'T2',
}

// ---------- WhatsApp deep-link numbers per seller ----------
export const WA_BY_SELLER: Record<string, string> = {
  Aldriano: '6281234567890',
  'Bimo S.': '6281298765432',
  'Citra D.': '6281377788899',
  'Dewi R.': '6281344455566',
  'Eka W.': '6281255566677',
  'Fajar N.': '6281399900011',
  'Gilang H.': '6281266677788',
  'Hana P.': '6281233344455',
  'Indah K.': '6281288899900',
}

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
