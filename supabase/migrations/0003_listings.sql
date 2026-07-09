-- ============================================================
-- LOKITA — Section 2 (Listings): featured flag + helpful index.
-- Apply after 0001/0002. Safe to re-run.
-- ============================================================

alter table public.listings
  add column if not exists is_featured boolean not null default false;

-- feed ordering: featured first, then newest
create index if not exists idx_listings_featured on public.listings (is_featured, created_at desc);
