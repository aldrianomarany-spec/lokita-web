-- 0026 — site_settings: small key/value store for admin-tunable knobs.
-- First use: the announcement ticker (scroll speed + whether items are
-- clickable or pure decoration). Everyone reads, only admins write; realtime
-- so every open tab restyles instantly when the admin flips a setting.
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy site_settings_read_all on public.site_settings
  for select using (true);
create policy site_settings_admin_insert on public.site_settings
  for insert with check (public.is_admin());
create policy site_settings_admin_update on public.site_settings
  for update using (public.is_admin());

grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;

insert into public.site_settings (key, value)
values ('ticker', '{"speed": "normal", "clickable": true}'::jsonb)
on conflict (key) do nothing;

alter publication supabase_realtime add table public.site_settings;
