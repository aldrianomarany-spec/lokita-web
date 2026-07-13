-- ============================================================================
-- 0027 — true push notifications + featured-listing boosts
--
-- push_subscriptions: one row per browser/device push endpoint. The Vercel
-- serverless sender (api/push/send.js) reads these with the service key when
-- a Supabase Database Webhook fires on notifications INSERT.
--
-- Boosts: sellers request the gold FEATURED slot for 3 or 7 days; the admin
-- approves after confirming payment (manual until Midtrans). Approval sets
-- listings.is_featured + featured_until; expire_featured() clears it on
-- app start once the window passes.
-- ============================================================================

create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
create policy push_subs_own_select on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy push_subs_own_insert on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy push_subs_own_update on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy push_subs_own_delete on public.push_subscriptions
  for delete using (auth.uid() = user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ---- featured boosts ----
alter table public.listings add column if not exists featured_until timestamptz;

create table if not exists public.boost_requests (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id  uuid not null references public.profiles(id) on delete cascade,
  days       int  not null check (days in (3, 7)),
  amount     int  not null check (amount > 0),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_boosts_status on public.boost_requests(status);

alter table public.boost_requests enable row level security;
-- sellers may request boosts only for their own listing
create policy boosts_insert_own on public.boost_requests
  for insert with check (
    auth.uid() = seller_id
    and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );
create policy boosts_select_own_or_admin on public.boost_requests
  for select using (auth.uid() = seller_id or public.is_admin());
create policy boosts_update_admin on public.boost_requests
  for update using (public.is_admin());
grant select, insert, update on public.boost_requests to authenticated;

-- clear expired FEATURED slots (called on app start with the other sweeps)
create or replace function public.expire_featured()
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
     set is_featured = false, featured_until = null
   where featured_until is not null and featured_until < now();
$$;
revoke all on function public.expire_featured() from public;
grant execute on function public.expire_featured() to authenticated;
