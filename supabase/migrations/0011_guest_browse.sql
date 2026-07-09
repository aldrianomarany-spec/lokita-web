-- ============================================================
-- LOKITA — Guest mode: allow anonymous (not-logged-in) visitors to browse.
-- Apply after 0001–0010. Safe to re-run.
--
-- Active listings + photos + reviews were already anon-readable via their RLS
-- policies; the only missing piece is the public_profiles view (seller names /
-- avatars / verified badges), which was granted to `authenticated` only.
-- Guests are read-only: every write path still requires auth.uid().
-- ============================================================
grant select on public.public_profiles to anon;
