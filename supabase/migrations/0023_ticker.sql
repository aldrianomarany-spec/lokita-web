-- 0023 — banner placement: 'hero' (black homepage panel) or 'ticker'
-- (the moving announcement strip above the top bar, visible on every view).
alter table public.banners
  add column if not exists placement text not null default 'hero'
  check (placement in ('hero','ticker'));
