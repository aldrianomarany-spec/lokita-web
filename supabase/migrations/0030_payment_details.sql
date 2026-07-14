-- ============================================================================
-- 0030 — seller payment details, privacy-first (Option E groundwork)
--
-- Sellers save how buyers can pay them at handover: an e-wallet number, a
-- bank account, and/or their personal QRIS image. LOKITA only DISPLAYS these
-- at the right moment — it never touches the money.
--
-- Privacy model (enforced in the database, not just the UI):
--  * details live in their own locked table, NEVER in the public_profiles
--    view other members read
--  * readable by exactly two parties: the owner, and a buyer whose order
--    from that seller is currently active (accepted or ready for pickup)
--  * the QRIS image is stored inline as a data-URL in the row itself, so it
--    is covered by the same RLS — no public bucket URL that could leak
--  * only a boolean "accepts_cashless" flag is public (powers the 💳 chip);
--    it exposes nothing but the fact that details exist
-- ============================================================================

create table if not exists public.payment_details (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  ewallet_provider text check (ewallet_provider in ('GoPay','OVO','DANA','ShopeePay','LinkAja')),
  ewallet_number   text check (char_length(ewallet_number) <= 20),
  bank_name        text check (char_length(bank_name) <= 40),
  bank_account     text check (char_length(bank_account) <= 40),
  -- personal QR photo as a compressed data-URL (~20-80kB) — RLS-protected text
  qris_data_url    text check (char_length(qris_data_url) <= 150000),
  updated_at       timestamptz not null default now()
);

alter table public.payment_details enable row level security;

-- owner: full control of their own row
create policy payment_details_own on public.payment_details
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- the reveal rule: a buyer may read the seller's details ONLY while they have
-- an accepted, still-active order from that seller ('paid' = seller accepted,
-- 'dropped_off' = ready for pickup). Pending, completed and cancelled orders
-- grant nothing.
create policy payment_details_buyer_reveal on public.payment_details
  for select using (
    exists (
      select 1 from public.transactions t
      where t.seller_id = payment_details.user_id
        and t.buyer_id = auth.uid()
        and t.status in ('paid', 'dropped_off')
    )
  );

grant select, insert, update, delete on public.payment_details to authenticated;

-- public 💳 flag: TRUE when any payment detail is saved. Synced by trigger so
-- the flag can never disagree with the locked table.
alter table public.profiles
  add column if not exists accepts_cashless boolean not null default false;

create or replace function public.sync_accepts_cashless()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid; has_any boolean;
begin
  uid := coalesce(new.user_id, old.user_id);
  select exists (
    select 1 from public.payment_details
    where user_id = uid
      and (ewallet_number is not null or bank_account is not null or qris_data_url is not null)
  ) into has_any;
  update public.profiles set accepts_cashless = has_any where id = uid;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_sync_accepts_cashless on public.payment_details;
create trigger trg_sync_accepts_cashless
  after insert or update or delete on public.payment_details
  for each row execute function public.sync_accepts_cashless();

-- public_profiles gains ONLY the boolean — never the details themselves
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, profile_photo_url, building, floor,
         batch_year, class_standing, major,
         verification_status, role, last_seen_at, accepts_cashless, created_at
  from public.profiles;
grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;
