-- ============================================================
-- LOKITA — Requests, real bundles, Main Building. Apply after 0001–0011.
-- Safe to re-run.
--
-- 1. requests: buyers post "looking for X"; anyone signed in can respond.
-- 2. listings.bundle_items: what's inside a graduation bundle (shown as a
--    checklist on the item page).
-- 3. "Main Building" (JIU staff & lecturers) as a valid building, with floors
--    mg (Ground), m1, m2 — on both profiles and listings.
-- 4. conversations may now be request chats (no listing): listing_id null is
--    allowed; listing-based chats still must reference the real seller.
-- ============================================================

-- ---------- 1. requests ----------
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  category    text check (category in ('furniture','electronics','appliances','clothes','books','bundles','others')),
  budget_max  numeric(12,2) check (budget_max >= 0),
  status      text not null default 'open' check (status in ('open','fulfilled','closed')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_requests_status_time on public.requests (status, created_at desc);

alter table public.requests enable row level security;
drop policy if exists requests_select_all on public.requests;
create policy requests_select_all on public.requests
  for select using (true);
drop policy if exists requests_insert_own on public.requests;
create policy requests_insert_own on public.requests
  for insert with check (user_id = auth.uid());
drop policy if exists requests_update_own on public.requests;
create policy requests_update_own on public.requests
  for update using (user_id = auth.uid() or public.is_admin())
             with check (user_id = auth.uid() or public.is_admin());
drop policy if exists requests_delete_own on public.requests;
create policy requests_delete_own on public.requests
  for delete using (user_id = auth.uid() or public.is_admin());

-- ---------- 2. bundle contents ----------
alter table public.listings add column if not exists bundle_items text[];

-- ---------- 3. Main Building ----------
alter table public.profiles drop constraint if exists profiles_building_check;
alter table public.profiles add constraint profiles_building_check
  check (building in ('thomas','union','elizabeth','main'));
alter table public.profiles drop constraint if exists profiles_floor_check;
alter table public.profiles add constraint profiles_floor_check
  check (floor in ('ground','t1','t2','t3','u2','u3','e1','e2','e3','mg','m1','m2'));

alter table public.listings drop constraint if exists listings_building_check;
alter table public.listings add constraint listings_building_check
  check (building in ('thomas','union','elizabeth','main'));
alter table public.listings drop constraint if exists listings_floor_check;
alter table public.listings add constraint listings_floor_check
  check (floor in ('ground','t1','t2','t3','u2','u3','e1','e2','e3','mg','m1','m2'));

-- ---------- 4. request chats (conversations without a listing) ----------
drop policy if exists conversations_insert_buyer on public.conversations;
create policy conversations_insert_buyer on public.conversations
  for insert with check (
    buyer_id = auth.uid()
    and buyer_id is distinct from seller_id
    and (
      listing_id is null -- request chat: initiator ↔ requester
      or exists (
        select 1 from public.listings l
        where l.id = conversations.listing_id
          and l.seller_id = conversations.seller_id
      )
    )
  );
