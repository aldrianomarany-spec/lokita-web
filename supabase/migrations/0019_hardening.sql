-- ============================================================================
-- 0019 — hardening: ban enforcement + stale-order expiry
--
-- 1) BAN ENFORCEMENT. profiles.is_banned existed since 0001 but nothing used
--    it. is_banned() + RESTRICTIVE insert policies now block banned accounts
--    from creating anything new (listings, messages, orders, conversations,
--    requests, reviews, reports). They can still log in and browse — the app
--    shows them a "restricted" banner. Admins flip the flag from the Control
--    Room (profiles_update policy + the privileged-columns trigger already
--    allow only admins to touch is_banned).
--
-- 2) STALE-ORDER EXPIRY. Deadlines existed but were never enforced, so an
--    ignored order reserved an item forever. expire_stale_orders() cancels:
--      · pending orders older than 48h (seller never confirmed)
--      · paid orders past their drop-off deadline (seller never dropped off)
--    dropped_off orders are left alone — the item is physically at the
--    Security Post and needs a human decision. The app calls this
--    fire-and-forget on startup; existing triggers free the listing and
--    notify both parties on each cancellation.
-- ============================================================================

-- ---- 1) ban enforcement ----------------------------------------------------

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_banned from public.profiles where id = auth.uid()),
    false
  );
$$;

-- RESTRICTIVE policies AND with the existing permissive ones.
create policy banned_no_listings on public.listings
  as restrictive for insert with check (not public.is_banned());
create policy banned_no_messages on public.messages
  as restrictive for insert with check (not public.is_banned());
create policy banned_no_transactions on public.transactions
  as restrictive for insert with check (not public.is_banned());
create policy banned_no_conversations on public.conversations
  as restrictive for insert with check (not public.is_banned());
create policy banned_no_reviews on public.reviews
  as restrictive for insert with check (not public.is_banned());
create policy banned_no_reports on public.reports
  as restrictive for insert with check (not public.is_banned());
create policy banned_no_requests on public.requests
  as restrictive for insert with check (not public.is_banned());

-- ---- 2) stale-order expiry --------------------------------------------------

create or replace function public.expire_stale_orders()
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactions
     set status = 'cancelled'
   where (status = 'pending' and created_at < now() - interval '48 hours')
      or (status = 'paid' and dropoff_deadline is not null and dropoff_deadline < now());
$$;

revoke all on function public.expire_stale_orders() from public;
grant execute on function public.expire_stale_orders() to authenticated;
