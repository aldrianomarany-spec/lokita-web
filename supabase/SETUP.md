# LOKITA — Supabase setup (Step 1: auth · database · storage)

This gets the backend foundation running. **No UI yet** — the goal is a working
Supabase project you can confirm with a test sign-up.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> → **Sign in** (GitHub login is easiest) → **New project**.
2. Pick your org, then:
   - **Name:** `lokita`
   - **Database password:** generate a strong one and save it (password manager).
   - **Region:** choose the closest to Cikarang — **Southeast Asia (Singapore)**.
   - **Plan:** Free.
3. Click **Create new project** and wait ~2 minutes for it to provision.

## 2. Grab your API keys

In the dashboard: **Project Settings → API**. Copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

Then, in the app root (where `package.json` is):

```bash
cp .env.example .env
```

Paste the two values into `.env`. `.env` is gitignored — **never commit it**.
(The anon key is public and safe in the browser; the **service_role** key is not —
keep it out of the app entirely.)

## 3. Apply the database migrations

**Option A — SQL editor (simplest):**
Dashboard → **SQL Editor** → **New query**. Paste the entire contents of
`supabase/migrations/0001_init.sql`, run it, then do the same for
`supabase/migrations/0002_storage.sql`. Order matters (0001 first).

**Option B — Supabase CLI:**
```bash
npm i -g supabase
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Verify: **Table Editor** should show `profiles`, `listings`, `transactions`,
`reviews`, `conversations`, `messages`, `notifications`, `reports`, etc.
**Storage** should show buckets `listing-photos`, `profile-photos`,
`verification-docs` (the last one **not** public).

## 4. Auth settings

**Authentication → Providers:**

- **Email** — enabled by default.
  - For local testing, turn **"Confirm email" OFF** (Authentication → Providers →
    Email) so a sign-up gives you a session immediately. Turn it back on before
    production.
- **Google** — toggle on, then paste a **Client ID** and **Client secret** from a
  Google OAuth app:
  1. <https://console.cloud.google.com> → APIs & Services → **Credentials** →
     **Create credentials → OAuth client ID → Web application**.
  2. **Authorized redirect URI:** copy the callback URL Supabase shows on the
     Google provider page — it looks like
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
  3. Paste the resulting Client ID/secret back into Supabase and **Save**.

**Authentication → URL Configuration:** add your dev URL
`http://localhost:5173` to **Site URL** and **Redirect URLs** (so the Google
redirect and email links return to the app).

## 5. Confirm it works (test sign-up)

With `.env` filled in and email confirmation OFF:

```bash
npm run test:signup           # uses a random @example.com address
# or pick your own:
npm run test:signup -- you@student.jiu.ac.id somePassword123
```

A pass prints the new `auth.users` id **and** the matching `profiles` row —
proving the `handle_new_user` trigger fired. If it fails, the script says why
(missing env, email confirmation still on, migration not applied, etc.).

You can also eyeball it in the dashboard: **Authentication → Users** (new user)
and **Table Editor → profiles** (matching row, `verification_status = pending`).

---

## What exists after Step 1

- **DB schema** with RLS on every table (`0001_init.sql`).
- **Storage** buckets + policies (`0002_storage.sql`) — verification docs private.
- **Client**: `src/lib/supabase.ts` (env-based) and `src/lib/auth.ts` — a UI-less
  service layer: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`,
  `signOut`, `getSession`, `getMyProfile`, `completeProfile`,
  `uploadVerificationDoc`, `uploadProfilePhoto`.

**Next step (not done yet):** wire these into the existing screens and replace
the prototype's fake data with real listings.
