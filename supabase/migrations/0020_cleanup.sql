-- ============================================================================
-- 0020 — self-cleaning marketplace
--
-- Two stale-data sources were leaving ghost badges in the UI and junk in the
-- free-tier database:
--   · wishlist rows whose listing is sold/removed/deleted (⭐ badge counted
--     them while the wishlist page filtered them out)
--   · notifications that pile up forever
--
-- cleanup_stale_data() prunes both, for all users. The app calls it
-- fire-and-forget on startup (alongside expire_stale_orders), so the database
-- tidies itself whenever anyone opens LOKITA. Also runs the cleanup ONCE now,
-- so existing ghost badges disappear immediately after this migration.
-- ============================================================================

create or replace function public.cleanup_stale_data()
returns void
language sql
security definer
set search_path = public
as $$
  -- saves pointing at listings that are no longer for sale
  delete from public.wishlist w
   where not exists (
     select 1 from public.listings l
      where l.id = w.listing_id and l.status = 'active'
   );
  -- read notifications older than 14 days; anything older than 60 days
  delete from public.notifications
   where (is_read and created_at < now() - interval '14 days')
      or created_at < now() - interval '60 days';
$$;

revoke all on function public.cleanup_stale_data() from public;
grant execute on function public.cleanup_stale_data() to authenticated;

-- one-time sweep so current ghost data disappears right away
select public.cleanup_stale_data();
