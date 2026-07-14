-- ============================================================================
-- 0028 — chat image attachments, last-seen presence, Buyer Protection
--
--  * messages.image_url — photo messages (uploaded to the public
--    listing-photos bucket under <uid>/chat/, existing owner-folder RLS).
--  * profiles.last_seen_at — heartbeat written by the app (~every 4 min);
--    exposed via public_profiles so People shows "last seen 2h ago".
--    public_profiles also now exposes `role` so admins get a distinct badge.
--  * transactions.protection_enabled / protection_fee — tiered, OPT-IN
--    Buyer Protection chosen at checkout. Informational for now (COD, no
--    gateway): tracked for dispute mediation + future collection.
-- ============================================================================

alter table public.messages add column if not exists image_url text;

alter table public.profiles add column if not exists last_seen_at timestamptz;

drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, profile_photo_url, building, floor,
         batch_year, class_standing, major,
         verification_status, role, last_seen_at, created_at
  from public.profiles;
grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;

alter table public.transactions
  add column if not exists protection_enabled boolean not null default false;
alter table public.transactions
  add column if not exists protection_fee numeric(12,2) not null default 0;
