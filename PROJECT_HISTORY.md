# LOKITA — Project History & Recovery File

**Purpose of this file:** if the Claude account ever changes or the chat history is lost,
open a new Claude Code session on this repo and say:
*"Read CLAUDE.md and PROJECT_HISTORY.md, then tell me the project status."*
Everything needed to continue is in these two files + the git commit history
(`git log --oneline` shows every change ever made, in order).

---

## The story, in order

### 1. Idea & design (human + Claude Design)
- The owner identified the problem: JIU dorm students graduate with stuff they can't
  carry home, while juniors buy everything new. Solution: a campus-only marketplace with
  Security Post drop-off (no risky meetups).
- The full visual design was created in **Claude Design** first (warm cream editorial look,
  Bricolage Grotesque/Hanken Grotesque/Spline Sans Mono fonts, blue accent, KAPI the mascot).
  That prototype became the pixel-faithful blueprint for the real app.

### 2. Foundation build (Claude Code)
- Scaffolded React 18 + Vite 5 + TypeScript, ported every screen from the design.
- Wired **Supabase**: Postgres database, Auth, Storage, RLS security, Realtime.
- Removed ALL mock data — the app is 100% real data with designed empty states.

### 3. Feature waves (each one driven by the owner testing the live site)
1. Auth: email/password + **Google OAuth** (any Google account; campus domain is `@jiu.ac`),
   forgot/reset password, guest browse mode, onboarding with persistence verification.
2. Listings: multi-photo upload, categories, conditions, buildings
   (Thomas / Union / Elizabeth / Main + per-building floors), building filter with ALL.
3. **Graduation Bundles** (sell a whole room) and the **Requests board**.
4. Orders with **seller confirmation**: pending → paid → dropped_off → completed;
   QRIS (prototype/static QR modes via env) or cash on delivery.
5. Messages rebuilt e-commerce style: pinned product card in the thread, item thumbnails,
   single-pane mobile with Back.
6. **Realtime everything**: feed, chat, notifications (+ clickable toast), presence/People
   view (online dots), requests, profiles, member stats. No manual refresh anywhere.
7. Member profiles (full page), housekeeping migrations to keep the free-tier DB lean.
8. **Revenue model** (pitch deck slide 6 made real): seller-side platform fee — 5% of the
   seller's ask, min Rp 1.000, max Rp 4.000 — added ON TOP at publish time, enforced by a
   DB trigger (migration 0017). Buyers pay the listed price with no extra checkout fee;
   sellers receive 100% of their ask.
9. **Ratings & reviews** (rate after a completed order; average + comments on member
   profiles) and the **Admin Control Room** — an admin-only sidebar view with platform
   stats, LOKITA revenue counter, listing moderation (remove/restore/feature) and member
   verification. No new migrations: it uses the `is_admin()` security rules that shipped
   in migration 0001. Grant admin with:
   `update public.profiles set role='admin' where email='<email>';`
10. **Reports (trust & safety)** — 🚩 Report button on item pages and member profiles
    (reason chips: Scam / Prohibited / Wrong info / Harassment / Other + optional note),
    a REPORTS queue at the top of the Control Room (Remove listing / View profile /
    Dismiss), and a red open-count badge on the Admin sidebar item. Rides the `reports`
    table + RLS from migration 0001 — zero new SQL.
11. **Privacy & Account pass** — migration 0018 removed `whatsapp_number` from the
    `public_profiles` view (it was API-readable by every member AND guests, while no UI
    ever showed it — all contact is in-app chat). Profile page gained an "Account &
    privacy" section: change password in-app (works for Google accounts too) and a
    plain-language card showing what other members see vs what only you see.
12. **Foundation upgrade (everything except Midtrans, deliberately last)**:
    - Migration 0019: ban enforcement (restrictive RLS insert policies on all user
      tables + `is_banned()`; admin Ban/Unban buttons; banned users see a browse-only
      banner) and `expire_stale_orders()` (pending >48h or missed drop-off deadline →
      auto-cancelled; called fire-and-forget on app start).
    - Client-side photo compression (`src/lib/img.ts`) on listing photos, avatars and
      verification docs — max 1600px JPEG, protects free-tier storage.
    - PWA: manifest + generated icons + theme-color → installable "Add to Home Screen".
    - Bundle split (vite manualChunks): app js 641 kB → 222 kB.
    - Legal pages at /terms and /privacy (fees, escrow, UU PDP), linked from signup
      consent line + profile footer.
    - Vercel Analytics component (owner must enable Analytics in the Vercel dashboard)
      and GitHub Actions CI (build check on every push/PR).
    - Real Midtrans QRIS remains the final step, pending the owner's Midtrans signup.

### 4. Deployment
- **GitHub** `aldrianomarany-spec/lokita-web` — work branch `lokita-web-v2`,
  **production deploys from `main`** (merge via GitHub's green PR button).
- **Vercel** hosts the site: **lokita.vercel.app** (SPA rewrite in `vercel.json`).
- **Supabase** migrations `0001`–`0017` in `supabase/migrations/`, applied by hand in the
  Supabase SQL Editor, in numeric order. Each was validated on a local throwaway Postgres
  before handoff.

## Key decisions (and why)

| Decision | Why |
|---|---|
| Fee charged to the SELLER at publish, baked into the price | Matches the pitch deck; buyers see one honest price, no checkout surprise |
| Fee enforced by DB trigger, not the browser | A modified client can't dodge it |
| Security Post drop-off as the default exchange | Campus safety — the core product promise |
| Everything realtime (Supabase channels + Presence) | "Feels like WhatsApp, not an old website" |
| No mock data ever | The demo IS the product; guests can try it live during pitches |
| Short-lived GitHub tokens per push, never stored | The original Claude account was shared/borrowed |

## How to resume on a new Claude account

1. Log into your personal Claude account → **claude.ai/code** → connect the GitHub repo
   (on a personal account you can link GitHub properly — no token ritual needed).
2. First message: *"Read CLAUDE.md and PROJECT_HISTORY.md, then tell me the project status."*
3. Verify it knows: the live URL, the platform-fee model, and that prod deploys from `main`.
4. Continue as before: describe → Claude builds → you test on the live site → report → repeat.

## Keeping this backup fresh (the routine)

At the end of ANY work session, tell Claude:
> "Update PROJECT_HISTORY.md and CLAUDE.md with what we did today, commit, and push."

That one sentence keeps this file current forever. The git history records every code
change automatically; these two files record the *why* and the *state*.
