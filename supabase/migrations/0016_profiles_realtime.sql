-- ============================================================
-- LOKITA — Realtime for profiles. Apply after 0001–0015. Safe to re-run.
-- The app subscribes to the signed-in user's own profile row so details and
-- the Dorm-Verified badge update live everywhere (RLS limits events to rows
-- the client may see: own row only).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
