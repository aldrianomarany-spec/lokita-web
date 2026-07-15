-- ============================================================================
-- 0040 — listing edits + shelf cap 20 (owner decisions)
--
--  1. Shelf cap raised: sellers may keep up to 20 desk items at once
--     (was 3 during the pilot). Direct donations still don't count.
--  2. The platform-fee trigger now also runs when a seller EDITS the price,
--     with a guard so an unchanged price is never re-charged. Fees are OFF
--     during launch, so today this simply keeps edited prices as typed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. cap 3 → 20
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
    if held >= 20 then
      raise exception 'Shelf limit reached: max 20 items with LOKITA at once. Wait for a sale or collect one back.';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. fee trigger fires on price edits too (no-op while the price is unchanged)
-- ---------------------------------------------------------------------------
create or replace function public.apply_platform_fee()
returns trigger language plpgsql as $$
begin
  -- editing without touching the price must never re-charge a fee
  if TG_OP = 'UPDATE' and new.price is not distinct from old.price then
    return new;
  end if;
  if new.price is null or new.price <= 0 then
    new.platform_fee := 0;
    return new;
  end if;
  -- launch mode: fees off → publish at the seller's ask, fee 0
  if not coalesce((select (value->>'enabled')::boolean
                   from public.site_settings where key = 'fees'), true) then
    new.platform_fee := 0;
    return new;
  end if;
  new.platform_fee := least(4000, greatest(1000, round(new.price * 0.05)));
  new.price := new.price + new.platform_fee;
  return new;
end $$;

drop trigger if exists trg_apply_platform_fee on public.listings;
create trigger trg_apply_platform_fee
  before insert or update of price on public.listings
  for each row execute function public.apply_platform_fee();
