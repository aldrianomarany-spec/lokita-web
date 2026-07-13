-- ============================================================================
-- 0025 — chat & profile upgrade
--  * profiles.major (student's study program, shown on profiles)
--  * public_profiles view recreated to include major
--  * messages.listing_id — Shopee-style product-card attachment on a message
--  * conversations delete policy — participants may delete a chat
--    (removes it for BOTH sides; messages cascade away)
--  * market_stats() — safe public aggregate: completed trades count for the
--    trust counter (transactions themselves stay party-readable only)
-- ============================================================================

alter table public.profiles add column if not exists major text
  check (major is null or major in
    ('Accounting','English Literature','Information Systems',
     'Information Technology','Japanese Literature','Visual Communication Design'));

drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, profile_photo_url, building, floor,
         batch_year, class_standing, major,
         verification_status, created_at
  from public.profiles;
grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;

alter table public.messages add column if not exists listing_id uuid
  references public.listings(id) on delete set null;
create index if not exists idx_messages_listing on public.messages(listing_id);

create policy conversations_delete_party on public.conversations
  for delete using (auth.uid() = buyer_id or auth.uid() = seller_id);

create or replace function public.market_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'completed_trades',
    (select count(*) from public.transactions where status = 'completed')
  );
$$;
revoke all on function public.market_stats() from public;
grant execute on function public.market_stats() to authenticated;
grant execute on function public.market_stats() to anon;
