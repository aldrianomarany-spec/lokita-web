-- ============================================================================
-- 0021 — promotion banners (Noir & Gold redesign)
--
-- Admin-managed carousel slot on the homepage: the LOKITA team writes
-- banners (announcement weeks, featured sellers, campaigns) from the Control
-- Room; everyone — including guests — sees the active ones rotate. When no
-- banner is active the app falls back to the featured-item hero, so the slot
-- is never empty.
-- ============================================================================

create table public.banners (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subtitle     text,
  cta_label    text,
  -- where the button goes: a category name, a listing id, the requests board,
  -- the sell form, or nowhere (informational)
  target_type  text not null default 'none'
               check (target_type in ('category','listing','requests','sell','none')),
  target_value text,
  sort         int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.banners enable row level security;

-- everyone (incl. guests) reads ACTIVE banners; admins see all
create policy banners_select on public.banners
  for select using (is_active or public.is_admin());
create policy banners_admin_write on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.banners to anon;
grant select, insert, update, delete on public.banners to authenticated;

-- live updates: publishing a banner appears on everyone's homepage instantly
alter publication supabase_realtime add table public.banners;
