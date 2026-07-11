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

Remaining / nice-to-have:
- **Real Midtrans QRIS** — deliberately last; blocked on the owner signing up for
  Midtrans. api/qris scaffolding exists; currently prototype/static-QR mode.
- Owner-side toggles: enable Vercel Analytics in the dashboard; custom domain.

Context: the user pitched LOKITA with a PPT (slide 6 = the revenue model above). The project
may continue from the user's personal Claude account — this file is the handoff; trust it over
missing chat history.
