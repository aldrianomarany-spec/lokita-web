# Deploying LOKITA (Vercel)

The frontend is a static Vite build; Supabase is already hosted, so deploying
is just the frontend. This gives you a shareable URL + real phone testing.

> Treat this as **staging** until the core features + security pass are done.
> Don't invite real students to sign up yet.

## 1. Import the repo
1. Go to <https://vercel.com> → sign in with GitHub.
2. **Add New… → Project** → import **aldrianomarany-spec/lokita-web**.
3. Vercel auto-detects Vite. Leave build settings as-is (`vercel.json` already
   sets the build command, output dir, and the SPA rewrite).

## 2. Set environment variables
In the import screen (or Project → Settings → Environment Variables) add the
**same two values** from your local `.env`:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

(Anon key is public/safe. Never add the service_role key.)

## 3. Deploy
Click **Deploy**. You'll get a URL like `https://lokita-web.vercel.app`.

## 4. Point Supabase at the deployed URL
So Google OAuth + password-reset links work on the live site:
Supabase → **Authentication → URL Configuration** → add your Vercel URL to
**Site URL** and **Redirect URLs** (keep `http://localhost:5173` too for local dev).

## Branch note
The app currently lives on the **`lokita-web-v2`** branch. In Vercel →
Project → Settings → Git, set the **Production Branch** to `lokita-web-v2`
(or merge it into `main` and deploy that). Every push to that branch then
auto-deploys.

## Before a real (public) launch
- Turn **"Confirm email" back ON** in Supabase.
- Finish the core features (listings, orders, messages) + the security pass.
- Add a custom SMTP sender (the built-in one is rate-limited for dev only).
