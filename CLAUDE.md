# CLAUDE.md — LOKITA

Guidance for Claude Code (and any AI agent) working in this repo. Read this first.

## What LOKITA is

A hyperlocal **dorm marketplace** for **Jakarta International University (JIU), Cikarang**.
Students buy/sell secondhand items with dorm-mates. Payment is held in escrow; the seller
drops the item at the campus **Security Post** and the buyer picks it up — no meetups.

- **Identity:** warm editorial. Cream canvas `#F1ECE1`, ink `#201E18`, blue accent `#2A5FA8`.
- **Fonts:** Bricolage Grotesque (display), Hanken Grotesque (body), Spline Sans Mono (labels).
- The visual design must stay **pixel-faithful** to the original Claude Design prototype
  (`LOKITA Web v2.dc.html`). Don't drift the styling when adding features.

## Stack

- **React 18 + Vite 5 + TypeScript** (strict; `noUnusedLocals` / `noUnusedParameters` on).
- **react-router-dom v6**.
- **Supabase** (free tier) — Postgres, Auth (email/password + Google OAuth), Storage, RLS, Realtime.
- No CSS framework — all styling is inline styles + `src/index.css`.

## Commands

```bash
npm run dev          # local dev server → http://localhost:5173
npm run build        # tsc -b && vite build  — ALWAYS run this to verify before handing off
npm run preview      # preview a production build
npm run test:signup  # scripts/test-signup.mjs — smoke-test Supabase auth signup
```

## Repo layout

- `src/lib/supabase.ts` — Supabase client. Reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  from env; **throws** if they're missing. `detectSessionInUrl: true`.
- `src/lib/auth.ts` — auth service (signup/signin/Google/signout/reset, profile CRUD, uploads).
  Holds the `Profile` DB type (snake_case) + enums (BuildingCode/FloorCode/ClassStanding).
- `src/lib/api.ts` — the data-access layer (~570 lines). Everything that touches DB tables:
  profiles, stats, listings, feed, orders, reviews, wishlist, conversations, messages,
  notifications, and all realtime `subscribe*` helpers. **New DB calls go here**, not in components.
- `src/marketplace/context.tsx` — `MarketplaceProvider` / `useM()`. Holds ALL app state + actions +
  realtime subscription `useEffect`s. This is the hub — most features are wired through here.
- `src/marketplace/*View.tsx` — the screens (Browse, Messages, Notifications, Orders, Profile).
- `src/marketplace/modals/` — Detail, Sell, Edit, Checkout, SellerProfile overlays.
- `src/auth/` — AuthFlow (splash + login/signup/forgot/reset), CompleteProfile onboarding, RequireSession guard.
- `src/theme.ts`, `src/types.ts`, `src/components/Icons.tsx` — shared foundation.
- `src/data.ts` — **intentionally empty** (`export {}`). All mock data was removed; the app is
  100% backed by Supabase and starts empty for new users. **Do not reintroduce mock/placeholder data.**

## Conventions

- **DB is snake_case, UI is camelCase.** `api.ts` owns the mapping (`dbToUiProfile`, `uiEditsToDb`,
  DB status codes → friendly labels). Keep that boundary — components see UI shapes, not raw DB rows.
- **All DB access flows through `api.ts` → `context.tsx` → components.** Components should not call
  Supabase directly.
- **Realtime:** subscriptions live in `context.tsx` effects and MUST clean up their channel on unmount.
  The open-thread callback reads current state via a `useRef` (`activeConvRef`) to avoid stale closures.
- **Empty states are designed, not accidental.** Every list has a first-class empty state — preserve them.
- Match the surrounding code's inline-style idiom and font/color tokens. No new styling systems.

## Database & migrations

Migrations live in `supabase/migrations/`, applied in order via the Supabase SQL Editor:

- `0001_init.sql` — profiles, listings, listing_photos, wishlist, transactions, reviews (bidirectional),
  conversations, messages, notifications + indexes + RLS + triggers (handle_new_user, privacy guards,
  is_admin, touch_updated_at) + public_profiles view.
- `0002_storage.sql` — buckets: `listing-photos` (public), `profile-photos` (public),
  `verification-docs` (private) + storage RLS.
- `0003_listings.sql` — `is_featured` column + index.
- `0004_orders.sql` — widened transactions status CHECK (paid/dropped_off/completed/cancelled),
  timestamps, realtime publication, `sync_listing_on_tx` trigger, txn-party listing RLS.
- `0005_notifications.sql` — notify_on_message / notify_on_order / notify_on_price_drop triggers
  (all SECURITY DEFINER) + conversations added to realtime publication.

**Rules for migrations:**
- Never edit an already-applied migration — add a new numbered file.
- **Validate every new migration locally before handing it over** (throwaway Postgres 16 with
  auth/storage schema stubs). Past bugs (e.g. `is_admin()` referencing profiles before it existed)
  were caught this way. Define objects in dependency order.
- Flag any RLS gap explicitly. No public writes; privileged profile columns
  (verification_status, is_admin, etc.) are protected by trigger.

## Security (hard rules)

- **`service_role` key must NEVER appear in frontend code.** Only the `anon` public key
  (safe to ship) goes in the client.
- Real keys live in the user's local `.env` — **never** paste keys into chat, commits, or files.
- RLS is the security boundary. Assume the client is hostile; enforce ownership in policies + triggers.

## Git & pushing (important — this is a shared setup)

- Repo: `github.com/aldrianomarany-spec/lokita-web`. Working branch: **`lokita-web-v2`**.
- The user pushes via a **short-lived fine-grained GitHub token** they paste per-push
  (scope: this repo only, Contents Read+Write). They do NOT link a GitHub account (shared Claude account).
- **Ritual:** use the token in-memory only → push → verify the token is NOT persisted in
  `.git/config` (`git config --get remote.origin.url` should show 0 credentials) → remind the user
  to revoke the token. **Never store or echo the token.**
- Do NOT open a pull request unless the user explicitly asks.

## Working with this user

- The user is **non-technical** and on **Windows** (clone at `C:\Users\PREDATOR\lokita-app`).
  Give **tiny, numbered, one-at-a-time steps** using Windows cmd / notepad. Wait for confirmation
  before the next step. Avoid jargon.
- After code changes, the user must `git pull` on Windows to see them — but pull only works
  **after** the change is pushed (which needs their token). Be explicit about this ordering;
  it has caused repeated "already up to date" confusion.
- `notepad` on a non-existent path creates a blank file that can block `git pull` — have the user
  `del` stray blank files first.

## Status / roadmap (last updated 2026-07-11)

**LIVE at `lokita.vercel.app`.** Vercel deploys **production from `main`**, previews from
`lokita-web-v2`. To ship: push to `lokita-web-v2`, then merge into `main` (user does this via
GitHub's "Compare & pull request" button).

Done and shipped:
- Auth (email/password + Google OAuth for any Google account; campus domain is `@jiu.ac`),
  guest browse mode, forgot/reset password, onboarding (CompleteProfile) with persistence check.
- Listings: multi-photo, buildings Thomas/Union/Elizabeth/Main (+ per-building floors),
  graduation bundles, requests board, save/wishlist star, building filter + ALL.
- Orders: pending → paid → dropped_off → completed with **seller confirmation**; QRIS
  (env `VITE_PAYMENT_MODE`, static QR via `VITE_QRIS_IMAGE_URL`) or cash on delivery.
- Realtime EVERYTHING: feed, chat (e-commerce style with pinned product card), notifications
  (+ clickable toast), presence/People (online dots), requests, profiles, member stats.
- **Revenue model (migration 0017)**: seller-side platform fee baked into the published price —
  fee = 5% of the seller's ask, min Rp 1.000, max Rp 4.000 (`platformFee()` in `src/theme.ts`).
  Published `listings.price` = ask + fee, set by the `apply_platform_fee` BEFORE INSERT trigger
  (DB-authoritative; SellModal shows a matching live preview). Buyers pay NO extra fee at
  checkout — the cut is inside the listed price. Seller's take = `price - platform_fee`.
  The JS preview formula and the SQL trigger MUST stay in sync.
- Migrations 0001–0017 exist and are all applied in production (0017 confirmed 2026-07-11).
- Ratings & reviews: rate the counterparty after a completed order (OrdersView), average + list
  shown on member profiles. Backed by the `reviews` table + policies from 0001.
- **Admin Control Room** (`AdminView.tsx`, sidebar item visible when `profiles.role='admin'`):
  stats tiles + LOKITA revenue (sum of `platform_fee` on sold listings, + pending on active),
  listing moderation (remove/restore/feature), member verification toggle. Zero new migrations —
  it rides the `is_admin()` RLS policies from 0001. To grant admin:
  `update public.profiles set role='admin' where email='<email>';`
- **Reports**: `ReportForm.tsx` (🚩 on DetailModal + MemberProfileView, reason chips + note),
  REPORTS queue at the top of AdminView (Remove listing / View profile / Dismiss), red
  open-count badge on the Admin sidebar item (`state.openReports`, `countOpenReports()` —
  RLS-safe, returns 0 for non-admins). Uses the `reports` table from 0001; no new SQL.
- **Privacy (migration 0018)**: `public_profiles` view no longer exposes `whatsapp_number`
  (was readable by all members + anon guests; never shown in any UI — contact is in-app).
  Never re-add PII to that view. ProfileView has an "Account & privacy" card (change
  password via `updatePassword`, what-others-see summary).

Also shipped (foundation upgrade):
- Migration 0019: ban enforcement (restrictive insert policies + `is_banned()`, admin
  Ban/Unban, banned banner) + `expire_stale_orders()` called on app start.
- Migration 0020: `cleanup_stale_data()` (stale wishlist rows + old notifications),
  called on app start with the expiry sweep. Wishlist badge counts ACTIVE listings only;
  opening Notifications auto-marks all read.
- Photo compression before every upload (`src/lib/img.ts`).
- PWA (public/manifest.webmanifest + icons), vendor bundle split (vite manualChunks),
  legal pages `/terms` + `/privacy` (`src/pages/Legal.tsx`), Vercel Analytics component,
  GitHub Actions CI (.github/workflows/ci.yml).

Also shipped (Grid Market / Noir & Gold era, 2026-07-12/13):
- Full UI re-skin: jet-black statements + champagne gold `#C8A96A` on paper `#F5F5F3`,
  zero border-radius. Design restore points exist as git tags: `look-warm-editorial`,
  `look-grid-market`, `look-noir-gold`.
- **Admin banners (migrations 0021–0023)**: `banners` table (RLS: everyone reads active,
  admins manage; realtime). Two Control Room sections — big black homepage slot
  (`placement='hero'`, optional image via `uploadBannerImage`) and the blue moving
  announcement ticker (`placement='ticker'`, `Ticker.tsx`, marquee above TopBar app-wide).
- Homepage hero is a true **sliding carousel** (translateX track, 6s auto-advance that
  resets on manual dot clicks, clickable gold dots) — falls back to the featured item,
  then to Kapi. `subscribeBanners` MUST keep a unique channel topic per subscriber
  (two components subscribe; a shared literal topic crashes Supabase realtime).
- Branding is env-driven (`src/brand.ts`): `VITE_BRAND_LOGO_URL` + `VITE_MASCOT_URL`
  (Kapi the capybara) set in Vercel env. Logo shows in TopBar (desktop + phone),
  mascot in sidebar card, banner fallback panel, empty state, auth splash.
- Desktop sidebar: category list removed (chips above the grid own filtering) —
  replaced by QUICK ACTIONS (Sell / Saved) + MARKET PULSE (live listings, online count).

Also shipped (growth batch, 2026-07-13):
- **Share links**: every listing has a public deep link `/app?item=<id>`. RequireSession
  drops link visitors into read-only guest mode (no login wall). DetailModal share kit:
  WhatsApp (wa.me), copy link, native share sheet. Share text goes out in the user's language.
- **Recently viewed**: last 8 opened listing ids in localStorage (`lokita_recent`,
  `state.recents`), homepage row resolved against the live feed (sold items drop out).
- **Chat quick replies**: one-tap presets above the composer, different sets for the
  seller vs buyer side (`ConversationRow.i_am_seller`); `sendMsg(text?)` sends directly.
- **Bahasa Indonesia (i18n)**: `src/i18n.tsx` (LangProvider/useLang/LangToggle) +
  `src/i18n-id.ts` (EN string = key → ID translation; ~460 entries; missing keys fall
  back to English). Toggle in the desktop top bar, in the phone profile dropdown, and on
  the auth screens. RULES: never translate DB-bound values — `<option value={code}>`
  keeps the code, only the label goes through `t()`. Admin Control Room and /terms +
  /privacy intentionally stay English. New user-visible strings MUST be wrapped in t()
  with an ID entry added.

Also shipped (marketplace-app batch, 2026-07-13, migration 0025):
- **Chat = one thread per person**: fetchConversations groups by counterparty
  (`ConversationRow.conv_ids`); messages/reads/deletes span the group. NEVER
  key chat features on a single conversation id — resolve the group first
  (`groupIdsFor` in context.tsx).
- **Product-card attachments**: `messages.listing_id`; contacting a seller
  queues `state.pendingAttach` which rides the next message. "Make an offer"
  on DetailModal sends `💰 OFFER · Rp X` with the card attached.
- Delete chat (both sides, RLS delete policy + cascade), emoji keyboard,
  banned-word filter (`src/lib/moderation.ts`, enforced in api.ts at
  createListing/createRequest/sendMessage).
- Ticker: measured seamless marquee (repeats sets to fill width, ~150px/s).
- Market pulse: `market_stats()` SECURITY DEFINER → live "Trades completed".
- Sell form: up to 5 photos (first = cover), category starts blank/required.
- Profiles: `major` column (6 fixed programs), WhatsApp stored as `+62…`
  (dial-code picker), batch select 2021–2026, ⭐ TOP SELLER badge (5+ sales,
  4.5★+), Control Room analytics (8-week bar charts via fetchAdminTrends).

Also shipped (steel-blue batch, 2026-07-13, migration 0026):
- **Theme = Steel Blue `#519BB8`** (`look-steel-blue` tag; previous look tagged
  `look-noir-gold-v2`). ACCENT/ACCENT_DEEP in theme.ts + full palette sweep
  (old gold #C8A96A and tints all remapped); black statements + paper stay.
- **site_settings table** (key/value jsonb, everyone reads / admins write,
  realtime): first knob is `ticker` `{speed: slow|normal|fast, clickable}` —
  Control Room has speed chips + "decoration only" toggle; Ticker.tsx applies
  it live in every open tab.
- Banner/ticker target pickers are dropdowns (category list, active-listing
  list) — no more typing listing ids.

Also shipped (pro batch, 2026-07-13, migration 0027):
- **True Web Push**: public/sw.js + src/lib/push.ts (subscribes with
  VITE_VAPID_PUBLIC_KEY, saves to push_subscriptions) + api/push/send.js
  (Vercel fn, web-push, fired by a Supabase Database Webhook on
  notifications INSERT, guarded by PUSH_WEBHOOK_SECRET). Owner setup steps
  in docs/PUSH_SETUP.md — until configured everything fails soft.
- **Featured boosts**: 🚀 Boost on own listing (3d Rp3.000 / 7d Rp5.000) →
  boost_requests → Control Room BOOST REQUESTS queue → Approve sets
  is_featured + featured_until; expire_featured() sweeps on app start.
  Payment is confirmed manually in chat until Midtrans.
- **Dark mode (beta)**: inversion-based (index.css html[data-theme='dark'],
  images re-inverted), 🌙 toggle next to the language switch, localStorage.
- **Guidebook**: GuideView.tsx (view 'guide'), 📖 in sidebar + phone strip;
  bilingual buying/selling steps + feature glossary + house rules.
- Ticker never pauses (decoration behaviour per owner request); banner
  button labels come from CTA presets dropdown (+ custom).

Also shipped (marketplace polish batch, 2026-07-13, migration 0028):
- Chat photo messages (messages.image_url; upload via uploadChatImage to
  listing-photos/<uid>/chat/); 📎 button + image bubbles.
- profiles.last_seen_at heartbeat (touchLastSeen on boot + 4-min interval);
  People/member profiles show "Last seen Xh". public_profiles now also
  exposes `role` — admins get the 🛡️ ADMIN chip (steel blue) INSTEAD of the
  Verified icon everywhere (People, member profile, chat, seller card).
- Orders grouped into process sections (waiting/in process/pickup/done/
  cancelled); notifications grouped Today/Yesterday/This week/Older.
- Requests: budget input live-formats id-ID thousands; category starts
  blank; "I have this" auto-attaches the responder's matching active listing.
- Control Room member rows show real avatars.
- **Buyer Protection (OPT-IN, informational until a gateway)**:
  `protectionFee()` in theme.ts (tiered: <50k→1k, <200k→2.5k, <1jt→1.5%,
  else 1.75% cap 40k); checkout toggle sets transactions.protection_enabled
  + protection_fee; OrdersView shows a 🛡️ Protected chip. Keep the JS tiers
  authoritative — no DB trigger for this fee by design (not collected yet).

Launch prep (2026-07-14):
- Web Push fully confirmed working end-to-end on the owner's phone (Vercel
  fn api/push/send.js + Supabase DB webhook + sw.js). Install UX shipped:
  always-visible 📲 card on Notifications + profile-menu row (hide when
  standalone).
- `supabase/ops/reset_for_launch.sql` — ONE-TIME pre-launch wipe: truncates
  all content tables, deletes every non-admin auth user, deletes storage
  files except admin folders (logo/mascot/banner art live there), keeps
  site_settings. Validated in the local harness (seeded every table + fake
  storage rows, asserted survivors). Do NOT re-run after launch.
- `docs/EMAIL_TEMPLATES.md` — branded Confirm-signup + Reset-password HTML
  for Supabase Auth → Email Templates (keep {{ .ConfirmationURL }} intact).

Growth + hardening batch (2026-07-14, **migration 0029** — validated in the
local harness with functional tests for every mechanism):
- 💝 **Free & Donations**: listings.is_giveaway (trigger forces price 0 + fee 0
  even from a tampered client); SellModal toggle; sidebar/catbar/chips filter
  (state.freeOnly rides loadFeed via freeOnlyRef); FREE badges; checkout skips
  payment + protection for giveaways.
- 👁 view counts (increment_view RPC skips owners; shown to owners only),
  🔔 saved-search alerts (search_alerts + DB trigger → notification → push;
  "Alert me" button on empty search, manage chips in Notifications, cap 10),
  🚫 blocks (blocks table + message/conversation guard triggers; UI in chat
  header + member profile; feed/convs filtered via state.blockedIds).
- 🧾 order receipts (transactions.pickup_code — 6-char handover code chip on
  active orders, full receipt card + QR on completed), 🔗 storefront share
  (?member=<id> deep link), ✅ getting-started checklist (BrowseView,
  localStorage lokita_gs_done), 🎓 moveout season (site_settings 'moveout',
  admin toggle, homepage strip).
- Control Room: 📣 broadcast (admin_broadcast RPC → notification+push to all),
  🧾 audit trail (admin_audit; logAdmin() wired into every admin api fn),
  🐞 error inbox (client_errors; src/lib/errlog.ts reports window.onerror /
  unhandledrejection, cap 5/session + 50/hr DB backstop), NEW MEMBERS trend.
- DB rate limits: 10 listings/day, 20 msgs/min, 10 reports/day, 5 requests/day.
- Search: fetchFeed matches title OR description (or() with sanitized term);
  pg_trgm indexes for scale.
- Feed thumbnails: makeThumb (360px) uploaded as thumb_<i>.jpg next to each
  photo; grid uses thumbUrl() with onError fallback to the full image.
- Ops: api/cron/cleanup.js (Vercel daily cron 19:00 UTC — expiries, notif
  purge, stale-listing nudges via listings.last_nudged_at, ID-photo purge 30d
  post-verification, 📊 admin daily digest; needs CRON_SECRET env),
  api/health.js (UptimeRobot target), docs/OPERATIONS.md (owner routines).
- NOTE: user must run migration 0029 + add CRON_SECRET in Vercel + redeploy.

Payments phase 1 (2026-07-14, **migration 0030** — validated in harness incl.
all RLS states): Option E model — item money moves buyer→seller directly
(cash or seller's own e-wallet/QR); only boosts+protection fees will flow
through Midtrans (phase 2, awaiting owner's Sandbox keys in Vercel as
MIDTRANS_SERVER_KEY + VITE_MIDTRANS_CLIENT_KEY).
- payment_details table: e-wallet/bank/QR-as-data-url (NO storage bucket —
  the QR lives inline in the RLS-protected row). Reveal policy: owner + a
  buyer with an order in status paid/dropped_off ONLY. profiles.
  accepts_cashless synced by trigger; public_profiles recreated with it.
- UI: ProfileView "💳 How buyers can pay you" editor (fileToQrDataUrl in
  img.ts); OrdersView buyer card shows seller payment methods + scannable QR
  while active (hidden for qris-paid orders); 💳 chips on feed cards +
  DetailModal seller card (sellerCashless via public_profiles flag);
  privacy-policy paragraph added.

Payments phase 2 (2026-07-14, **migration 0031**): real Midtrans QRIS for
LOKITA's OWN fees only (Option E — item money stays buyer→seller):
- api/qris/fee.js: JWT-authed charge creation for kind boost|protection;
  amounts read from DB rows (boost_requests.amount / transactions.
  protection_fee), order ids lokitab-<id> / lokitap-<id>, refs stored for
  webhook cross-check.
- api/qris/webhook.js extended: settlement of lokitab- → boost approved +
  listing featured + 🚀 notification + audit; lokitap- → protection_paid +
  🛡️ notification. Item flow (lokita-) unchanged. ONE notification URL:
  https://lokita.vercel.app/api/qris/webhook — must be set in BOTH Midtrans
  dashboards (sandbox + production, Settings → Configuration).
- UI: DetailModal boost card shows live QR + 3s polling → "FEATURED now!";
  falls back to the manual admin flow if the gateway isn't configured.
  CheckoutModal done step: ProtectionPayBox (QR + poll → active ✓, or
  informational fallback). OrdersView protection chip: green paid / amber
  "Protection · unpaid". requestBoost returns the row id now.
- Env: MIDTRANS_SERVER_KEY (+ optional MIDTRANS_IS_PRODUCTION=true later);
  VITE_MIDTRANS_CLIENT_KEY reserved for future Snap use.
- Sandbox test: pay QRIS via https://simulator.sandbox.midtrans.com

Handover redesign (2026-07-14, **migration 0032** — validated): every item
payment now happens AT handover, never before (owner decision — the demo
QRIS pay option was misleading and removed):
- Checkout: payment method section deleted (pay always 'cod' internally);
  "Pay at handover" info box; pickup methods relabeled: Security Post
  (📸 photo proof), 📦 LOKITA Handover (team custody, FREE for now — re-uses
  pickup_method 'trusted_handoff'), Meet in person (preset MEETUP_SPOTS
  picker → transactions.meetup_spot).
- Seller drop-off for security_post/trusted_handoff REQUIRES a camera photo
  (uploadDropoffPhoto → listing-photos/<uid>/dropoff/<order>.jpg →
  transactions.dropoff_photo_url); meet_in_person keeps a plain
  "handed over" button. Buyer sees the proof photo on the order.
- Chat contact guard (anti fee-dodging, owner opt-in): findContactLeak in
  moderation.ts blocks phone numbers / wa.me / t.me in messages until the
  pair has ANY transaction (checked in api.sendMessage; bilingual error).
- Copy updated (DetailModal trust note, Sidebar card) — no more "escrow /
  pay in-app now" wording. QRIS coStep flow retained but unreachable for
  items; boosts + protection still pay by real Midtrans QRIS.

Middleman launch mode (2026-07-14, **migration 0034** — validated; owner
decisions: buyer pays seller directly at the desk, pickups by appointment):
- Platform fee = DATA SWITCH via site_settings 'fees' (OFF now). The fee
  trigger consults it; Control Room "💰 MONEY & HANDOVER DESK" card has the
  ON/OFF toggle + admin payment info (gopay/bank → site_settings
  'admin_pay') + handover desk editor (location/hours → 'handover',
  defaults Union Building Room 303 / by appointment).
- Checkout: ONLY 📦 LOKITA Handover offered (ENABLED_PICKUPS in
  CheckoutModal — Security Post + Meet in person kept for one-line
  re-enable); handover desk info box + 💬 chatAdmin() (context action →
  getOrCreateRequestConversation with fetchAdminContactId()); platform-fee
  row removed from the buy summary; SellModal shows "no fees during launch"
  note when feesOn=false.
- Boost + protection fees: MANUAL transfer to admin details + screenshot
  proof (ManualFeePay.tsx shared component; attachBoostProof /
  attachProtectionProof → proof_url / protection_proof_url). Control Room:
  🛡️ PROTECTION PAYMENTS queue (admin_pending_protections /
  admin_confirm_protection definer fns) + proof thumbnails on boost rows.
  Protection chip: unpaid → under review → Protected. Midtrans code
  (api/qris/fee.js + webhook branches) kept dormant for later automation.

Consignment model (2026-07-14, **migration 0035** — validated incl. all
gates; owner decisions: verified sellers, 3-item shelf, receipt required):
- listings.status gains 'pending' (client posts as pending; existing select
  policy already hides non-active from the public). Admin approves in
  LISTINGS · MODERATION ("Approve ✓ (item received)", 📦 count in header).
- DB gates (definer triggers, admin bypass): enforce_seller_ready (complete
  profile + verified + shelf cap 3 pending/active), enforce_buyer_ready
  (complete profile). Friendly client-side pre-checks in openSell/
  openCheckout redirect to Profile.
- Pay-first flow: payment_details reveal policy now includes status
  'pending'; transactions.payment_proof_url = buyer's transfer receipt;
  protect_transaction_update requires it before status→'paid' (giveaways
  exempt). OrdersView: buyer pending = seller pay card + receipt upload;
  seller pending = receipt thumb + gated "Money received — confirm ✓";
  paid + trusted_handoff = buyer chatAdmin pickup button + confirm, seller
  sees "team hands it over".
- Admin notifications (definer triggers): 📦 item incoming on pending post,
  🤝 pickup to arrange on status→paid.
- UI: SellModal custody explainer + "Sent for review" state; ProfileView
  📦 BRING TO DESK cards; DetailModal "✓ In LOKITA custody" chip; checkout
  done-msg pay-first; cron nudge wording = shelf return.
- HARNESS NOTE: run35.sh disables the two gate triggers for the legacy
  suite and re-enables in the 0035 section; 0030's pending-reveal + hidden-
  after-completion expectations updated for the pay-first policy.

Remaining / nice-to-have:
- **Real Midtrans QRIS** — deliberately last; blocked on the owner signing up for
  Midtrans. api/qris scaffolding exists; currently prototype/static-QR mode.
- Owner-side toggles: enable Vercel Analytics in the dashboard; custom domain
  (owner buys e.g. lokita.id, then add it in Vercel → Domains).

Context: the user pitched LOKITA with a PPT (slide 6 = the revenue model above). The project
may continue from the user's personal Claude account — this file is the handoff; trust it over
missing chat history.
