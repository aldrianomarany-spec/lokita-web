-- ============================================================
-- LOKITA — Realtime for the listings feed.
-- Apply after 0001–0007. Safe to re-run.
--
-- Adds public.listings to the supabase_realtime publication so the browse feed
-- can live-update: new posts appear, price changes reflect, and sold/removed
-- items drop out — all without a manual refresh. RLS still applies, so clients
-- only receive events for listings they're allowed to see (active, or their own).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listings'
  ) then
    alter publication supabase_realtime add table public.listings;
  end if;
end $$;
