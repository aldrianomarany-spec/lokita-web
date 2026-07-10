-- ============================================================================
-- 0017 — LOKITA revenue: seller-side platform fee, baked into the price
--
-- Business model (pitch deck slide 6): when a seller publishes a listing,
-- LOKITA adds a platform fee on top of their asking price —
--   fee = 5% of the ask, floored at Rp 1.000 and capped at Rp 4.000.
-- The stored/published `price` (what buyers see and pay everywhere) is
-- ask + fee; `platform_fee` records LOKITA's cut, so the seller's take is
-- always `price - platform_fee`.
--
-- The client sends the seller's ASK in `price`; this BEFORE INSERT trigger
-- computes the fee and bumps the price, so a modified client can't dodge it.
-- The formula must stay in sync with platformFee() in src/theme.ts.
-- Existing rows keep platform_fee = 0 (published before the fee existed).
-- ============================================================================

alter table public.listings
  add column if not exists platform_fee numeric(12,2) not null default 0
  check (platform_fee >= 0);

comment on column public.listings.price is
  'PUBLISHED price buyers pay — seller ask + platform_fee (set by trigger on insert)';
comment on column public.listings.platform_fee is
  'LOKITA''s cut inside price: 5% of the seller ask, min Rp 1.000, max Rp 4.000';

create or replace function public.apply_platform_fee()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.price is null or new.price <= 0 then
    new.platform_fee := 0;
    return new;
  end if;
  -- round() on numeric = half away from zero — matches JS Math.round for
  -- positive amounts, keeping the client preview exact.
  new.platform_fee := least(4000, greatest(1000, round(new.price * 0.05)));
  new.price := new.price + new.platform_fee;
  return new;
end;
$$;

drop trigger if exists trg_apply_platform_fee on public.listings;
create trigger trg_apply_platform_fee
  before insert on public.listings
  for each row execute function public.apply_platform_fee();
