-- 0006_elizabeth.sql
-- Add "Elizabeth Building" (floors e1, e2, e3 = "Floor 1/2/3") as a valid dorm.
-- Widens the building/floor CHECK constraints on both profiles and listings.
-- Security Post stays a separate shared drop-off point — it is NOT a building
-- and gets no floor entry here.
--
-- The original constraints were created inline in 0001, so Postgres named them
-- <table>_<column>_check. We drop-if-exists then re-add with the wider list, so
-- this migration is safe to re-run.

-- ---------- profiles ----------
alter table public.profiles drop constraint if exists profiles_building_check;
alter table public.profiles
  add constraint profiles_building_check
  check (building in ('thomas','union','elizabeth'));

alter table public.profiles drop constraint if exists profiles_floor_check;
alter table public.profiles
  add constraint profiles_floor_check
  check (floor in ('ground','t1','t2','t3','u2','u3','e1','e2','e3'));

-- ---------- listings ----------
alter table public.listings drop constraint if exists listings_building_check;
alter table public.listings
  add constraint listings_building_check
  check (building in ('thomas','union','elizabeth'));

alter table public.listings drop constraint if exists listings_floor_check;
alter table public.listings
  add constraint listings_floor_check
  check (floor in ('ground','t1','t2','t3','u2','u3','e1','e2','e3'));
