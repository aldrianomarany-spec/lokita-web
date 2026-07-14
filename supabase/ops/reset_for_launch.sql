-- ============================================================================
-- LOKITA — ONE-TIME FULL RESET (run once, right before public launch)
--
-- ⚠️  DESTRUCTIVE AND IRREVERSIBLE. This wipes every listing, chat, order,
--     review, request, notification, report, boost and wishlist entry, and
--     DELETES every non-admin account. It keeps:
--       • admin accounts (so you stay logged in and stay admin)
--       • site settings (ticker speed etc.)
--       • files inside admin storage folders (logo, mascot, banner images)
--
-- How to run: Supabase Dashboard → SQL Editor → paste ALL of this → Run.
-- The SELECT at the bottom prints a summary so you can see it worked.
-- ============================================================================

begin;

-- 1) Wipe all marketplace content
truncate table
  public.messages,
  public.conversations,
  public.notifications,
  public.reports,
  public.reviews,
  public.wishlist,
  public.transactions,
  public.boost_requests,
  public.requests,
  public.listing_photos,
  public.listings,
  public.banners,
  public.push_subscriptions
  cascade;

-- 2) Delete every account that is not an admin.
--    Deleting from auth.users cascades to public.profiles automatically.
delete from auth.users
where id not in (select id from public.profiles where role = 'admin');

-- 3) Delete uploaded files, EXCEPT anything inside an admin's own folder —
--    that is where the logo, mascot and banner artwork live.
delete from storage.objects
where bucket_id in ('listing-photos', 'profile-photos', 'verification-docs')
  and coalesce((storage.foldername(name))[1], '')
      not in (select id::text from public.profiles where role = 'admin');

commit;

-- ---------------------------------------------------------------------------
-- Summary: everything below should be 0 except accounts_left (your admins)
-- and admin_files_kept (logo/mascot/banner images).
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.profiles)                                   as accounts_left,
  (select count(*) from public.listings)                                   as listings,
  (select count(*) from public.transactions)                               as orders,
  (select count(*) from public.conversations)                              as chats,
  (select count(*) from public.messages)                                   as messages,
  (select count(*) from public.notifications)                              as notifications,
  (select count(*) from public.requests)                                   as requests,
  (select count(*) from public.reviews)                                    as reviews,
  (select count(*) from public.reports)                                    as reports,
  (select count(*) from public.boost_requests)                             as boosts,
  (select count(*) from public.banners)                                    as banners,
  (select count(*) from storage.objects
    where bucket_id in ('listing-photos','profile-photos','verification-docs')) as admin_files_kept;

-- Health check (post-reset): every remaining account must have a floor set.
-- If any row comes back here, that person should log in once and re-pick
-- their floor on the profile screen.
select name, email, building, floor
from public.profiles
where floor is null;
