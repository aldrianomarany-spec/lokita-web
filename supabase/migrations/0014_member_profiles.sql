-- ============================================================
-- LOKITA — Full member profiles + realtime requests. Apply after 0001–0013.
-- Safe to re-run.
--
-- 1. member_stats(uid): public counts for another member's profile page.
--    Transactions/sold listings are RLS-protected (party-only), so exposing
--    "how many items has this member sold" needs a SECURITY DEFINER function
--    that returns ONLY the two counts — no row data leaks.
-- 2. requests join the realtime publication so a new request appears for
--    everyone instantly.
-- ============================================================
create or replace function public.member_stats(uid uuid)
returns table (selling bigint, sold bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.listings     where seller_id = uid and status = 'active'),
    (select count(*) from public.transactions where seller_id = uid and status = 'completed');
$$;

revoke all on function public.member_stats(uuid) from public;
grant execute on function public.member_stats(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests'
  ) then
    alter publication supabase_realtime add table public.requests;
  end if;
end $$;
