-- ============================================================================
-- 0038 — direct deals + giveaway asks (owner decisions)
--
--  1. listings.fulfillment: 'desk' (consignment — pending until the team
--     receives the item) or 'direct' (live immediately; buyer & seller
--     arrange the handover themselves). Giveaways default to direct.
--  2. Giveaway "asks": ordering a giveaway no longer reserves it — many
--     members can ask, the giver accepts ONE (that acceptance marks it
--     sold; the other asks are cancelled or expire).
--  3. Receipt rule: direct deals may be paid in cash at the handover, so
--     meet_in_person orders are exempt from the transfer-receipt requirement.
--  4. The 🤝 "Pickup to arrange" admin notification only fires for orders
--     the team actually handles (pickup_method = trusted_handoff).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. fulfillment mode
-- ---------------------------------------------------------------------------
alter table public.listings
  add column if not exists fulfillment text not null default 'desk'
  check (fulfillment in ('desk', 'direct'));

-- ---------------------------------------------------------------------------
-- 2. giveaway asks don't reserve the listing
-- ---------------------------------------------------------------------------
create or replace function public.sync_listing_on_tx()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- normal items: one order reserves the item.
    -- giveaways: an ask is just a hand raised — the giver picks later.
    update public.listings set status = 'sold'
     where id = new.listing_id and status = 'active' and not is_giveaway;
  elsif TG_OP = 'UPDATE' then
    -- giveaway accepted (pending → paid) → now it's spoken for
    if new.status = 'paid' and old.status = 'pending' then
      update public.listings set status = 'sold'
       where id = new.listing_id and status = 'active';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      -- back on sale only if no other live order still holds it
      update public.listings set status = 'active'
       where id = new.listing_id and status = 'sold'
         and not exists (
           select 1 from public.transactions t
           where t.listing_id = new.listing_id
             and t.id <> new.id
             and t.status not in ('cancelled')
         );
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. receipt exemption for direct handovers (cash is fine when you meet)
-- ---------------------------------------------------------------------------
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
      -- consignment rule: no confirming payment without the buyer's receipt.
      -- Exempt: giveaways (nothing to pay) and direct meet-ups (cash is fine).
      if new.status = 'paid'
         and coalesce(new.payment_proof_url, old.payment_proof_url) is null
         and coalesce(old.pickup_method, '') <> 'meet_in_person'
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
-- 4. the 3-item shelf cap counts DESK items only — direct deals never occupy
--    physical shelf space (profile + verification gates unchanged)
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
  if coalesce(new.fulfillment, 'desk') = 'desk' then
    select count(*) into held from public.listings
     where seller_id = new.seller_id and status in ('pending', 'active')
       and fulfillment = 'desk';
    if held >= 3 then
      raise exception 'Shelf limit reached: max 3 items with LOKITA at once. Wait for a sale or collect one back.';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 5. team pickup notification only for desk-handled orders
-- ---------------------------------------------------------------------------
create or replace function public.notify_admins_pickup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from new.status
     and new.pickup_method = 'trusted_handoff' then
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
