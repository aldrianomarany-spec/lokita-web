-- ============================================================================
-- 0035 — consignment model (owner decisions: verified sellers, 3-item shelf,
--        receipt-required payments)
--
--  Flow: seller posts → listing is PENDING (owner+admin only, thanks to the
--  existing select policy) → seller hands the item to the LOKITA desk →
--  admin approves → live with "in LOKITA custody" trust. Buyer orders →
--  transfers to the seller → uploads the receipt → seller confirms payment
--  → the team hands the item to the buyer.
--
--  1. listings.status gains 'pending'
--  2. seller gate: complete profile + Dorm-Verified before posting
--  3. shelf cap: max 3 items pending/active per seller
--  4. buyer gate: complete profile before ordering
--  5. transactions.payment_proof_url — the buyer's transfer receipt;
--     sellers cannot confirm payment without it (giveaways exempt)
--  6. admin notifications: item incoming (new pending listing) and
--     pickup-to-arrange (payment confirmed)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. pending state
-- ---------------------------------------------------------------------------
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('pending', 'active', 'sold', 'removed', 'flagged'));

-- ---------------------------------------------------------------------------
-- 2+3. seller gate + shelf cap (admins bypass both)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_seller_ready()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record; held int;
begin
  if public.is_admin() then
    return new;
  end if;
  select name, building, floor, room_number, whatsapp_number, verification_status
    into p from public.profiles where id = new.seller_id;
  if p is null
     or coalesce(btrim(p.name), '') = ''
     or p.building is null
     or p.floor is null
     or coalesce(btrim(p.room_number), '') = ''
     or coalesce(btrim(p.whatsapp_number), '') = '' then
    raise exception 'Complete your profile first (name, building, floor, room, WhatsApp) — Profile → Edit profile.';
  end if;
  if p.verification_status <> 'verified' then
    raise exception 'Verify your student ID first — upload it from your Profile page.';
  end if;
  select count(*) into held from public.listings
   where seller_id = new.seller_id and status in ('pending', 'active');
  if held >= 3 then
    raise exception 'Shelf limit reached: max 3 items with LOKITA at once. Wait for a sale or collect one back.';
  end if;
  return new;
end $$;
drop trigger if exists trg_enforce_seller_ready on public.listings;
create trigger trg_enforce_seller_ready
  before insert on public.listings
  for each row execute function public.enforce_seller_ready();

-- ---------------------------------------------------------------------------
-- 4. buyer gate
-- ---------------------------------------------------------------------------
create or replace function public.enforce_buyer_ready()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if public.is_admin() then
    return new;
  end if;
  select name, building, floor, whatsapp_number
    into p from public.profiles where id = new.buyer_id;
  if p is null
     or coalesce(btrim(p.name), '') = ''
     or p.building is null
     or p.floor is null
     or coalesce(btrim(p.whatsapp_number), '') = '' then
    raise exception 'Complete your profile first (name, building, floor, WhatsApp) — Profile → Edit profile.';
  end if;
  return new;
end $$;
drop trigger if exists trg_enforce_buyer_ready on public.transactions;
create trigger trg_enforce_buyer_ready
  before insert on public.transactions
  for each row execute function public.enforce_buyer_ready();

-- ---------------------------------------------------------------------------
-- 5. the buyer's transfer receipt, required before the seller confirms
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column if not exists payment_proof_url text;

-- buyers must see seller payment details from the moment they order
drop policy if exists payment_details_buyer_reveal on public.payment_details;
create policy payment_details_buyer_reveal on public.payment_details
  for select using (
    exists (
      select 1 from public.transactions t
      where t.seller_id = payment_details.user_id
        and t.buyer_id = auth.uid()
        and t.status in ('pending', 'paid', 'dropped_off')
    )
  );

create or replace function public.protect_transaction_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.buyer_id   is distinct from old.buyer_id
       or new.seller_id  is distinct from old.seller_id
       or (new.listing_id is distinct from old.listing_id and new.listing_id is not null)
       or new.created_at is distinct from old.created_at then
      raise exception 'These transaction fields cannot be changed';
    end if;
    if old.status in ('completed','cancelled')
       and new.status is distinct from old.status then
      raise exception 'This order is already finalised';
    end if;
    if new.status is distinct from old.status then
      if new.status = 'paid' and auth.uid() <> old.seller_id then
        raise exception 'Only the seller can confirm and accept the order';
      end if;
      -- consignment rule: no confirming payment without the buyer's receipt
      -- (free giveaways exempt — nothing to pay)
      if new.status = 'paid'
         and coalesce(new.payment_proof_url, old.payment_proof_url) is null
         and not exists (select 1 from public.listings l
                         where l.id = new.listing_id and l.is_giveaway) then
        raise exception 'Wait for the buyer''s transfer receipt before confirming payment.';
      end if;
      if new.status = 'dropped_off' and auth.uid() <> old.seller_id then
        raise exception 'Only the seller can mark drop-off';
      end if;
      if new.status = 'completed' and auth.uid() <> old.buyer_id then
        raise exception 'Only the buyer can confirm pickup';
      end if;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 6. admin notifications: incoming items + pickups to arrange
-- ---------------------------------------------------------------------------
create or replace function public.notify_admins_new_pending()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, reference_id, title, body)
    select id, 'system', new.id,
           '📦 Item incoming: ' || new.title,
           (select coalesce(name, 'A member') from public.profiles where id = new.seller_id)
             || ' will bring it to the desk — approve the listing once you have it.'
    from public.profiles where role = 'admin';
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_admins_new_pending on public.listings;
create trigger trg_notify_admins_new_pending
  after insert on public.listings
  for each row execute function public.notify_admins_new_pending();

create or replace function public.notify_admins_pickup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, reference_id, title, body)
    select id, 'system', new.id,
           '🤝 Pickup to arrange',
           'Payment confirmed for "' ||
           coalesce((select title from public.listings where id = new.listing_id), 'an item')
           || '" — the buyer will chat you to collect it.'
    from public.profiles where role = 'admin';
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_admins_pickup on public.transactions;
create trigger trg_notify_admins_pickup
  after update on public.transactions
  for each row execute function public.notify_admins_pickup();
