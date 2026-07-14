-- ============================================================================
-- 0029 — growth + hardening batch
--
--  1. Giveaways ("Free & Donations"): listings.is_giveaway — price forced to 0,
--     no platform fee. Charity corner of the marketplace.
--  2. View counts: listings.view_count + increment_view() RPC (viewers only,
--     never the owner) — sellers see how much attention an item gets.
--  3. Saved-search alerts: search_alerts table + trigger that notifies the
--     alert owner the moment a matching item is posted (rides the push chain).
--  4. Blocks: blocks table + guards so blocked pairs can't message each other
--     or open new conversations.
--  5. Pickup codes: transactions.pickup_code — both parties see the same
--     6-char code; the seller checks it at handover (receipt feature).
--  6. Anti-spam rate limits enforced in the DB (a modified client can't dodge
--     them): 10 listings/day, 20 messages/min, 10 reports/day, 5 requests/day,
--     10 search alerts total.
--  7. admin_broadcast(): one call → a notification for every member (push
--     webhook then buzzes every registered device).
--  8. admin_audit: every admin action recorded (who did what, when).
--  9. client_errors: browsers report JS crashes here; admins read them in the
--     Control Room (in-house error monitoring, no third-party SDK).
-- 10. pg_trgm indexes so title/description search stays fast as the catalog
--     grows; moveout-season toggle seeded into site_settings.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Giveaways
-- ---------------------------------------------------------------------------
alter table public.listings
  add column if not exists is_giveaway boolean not null default false;

-- runs AFTER apply_platform_fee (alphabetical trigger order: "trg_apply…" <
-- "trg_enforce…"), so even a tampered client posting is_giveaway + a price
-- ends up published free with no fee.
create or replace function public.enforce_giveaway()
returns trigger language plpgsql as $$
begin
  if new.is_giveaway then
    new.price := 0;
    new.platform_fee := 0;
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_giveaway on public.listings;
create trigger trg_enforce_giveaway
  before insert on public.listings
  for each row execute function public.enforce_giveaway();

-- ---------------------------------------------------------------------------
-- 2. View counts
-- ---------------------------------------------------------------------------
alter table public.listings
  add column if not exists view_count int not null default 0;

-- stale-listing nudges (daily cron): remembers when we last reminded the
-- seller so nobody gets nagged twice in the same fortnight
alter table public.listings
  add column if not exists last_nudged_at timestamptz;

-- definer so RLS update policies don't block it; owner views don't count
create or replace function public.increment_view(p_listing uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings
     set view_count = view_count + 1
   where id = p_listing
     and status = 'active'
     and (auth.uid() is null or seller_id <> auth.uid());
$$;
grant execute on function public.increment_view(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Saved-search alerts
-- ---------------------------------------------------------------------------
create table if not exists public.search_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  query      text not null check (length(btrim(query)) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, query)
);
alter table public.search_alerts enable row level security;
create policy search_alerts_own on public.search_alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.search_alerts to authenticated;

-- cap: 10 alerts per account (definer so the count always sees every row)
create or replace function public.limit_search_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.search_alerts where user_id = new.user_id) >= 10 then
    raise exception 'Alert limit reached (10). Delete one first.';
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_search_alerts on public.search_alerts;
create trigger trg_limit_search_alerts
  before insert on public.search_alerts
  for each row execute function public.limit_search_alerts();

-- new listing → notify everyone whose alert matches the title
create or replace function public.notify_search_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' then
    insert into public.notifications (user_id, type, reference_id, title, body)
    select distinct a.user_id, 'item_update', new.id,
           '🔔 MATCH: ' || new.title,
           'An item matching your alert "' || a.query || '" was just posted. Tap to see it.'
    from public.search_alerts a
    where a.user_id <> new.seller_id
      and new.title ilike '%' || a.query || '%';
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_search_alerts on public.listings;
create trigger trg_notify_search_alerts
  after insert on public.listings
  for each row execute function public.notify_search_alerts();

-- ---------------------------------------------------------------------------
-- 4. Blocks
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy blocks_own on public.blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
grant select, insert, delete on public.blocks to authenticated;

create or replace function public.pair_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.block_guard_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
    into other from public.conversations c where c.id = new.conversation_id;
  if other is not null and public.pair_blocked(new.sender_id, other) then
    raise exception 'You can''t exchange messages with this person.';
  end if;
  return new;
end $$;
drop trigger if exists trg_block_guard_message on public.messages;
create trigger trg_block_guard_message
  before insert on public.messages
  for each row execute function public.block_guard_message();

create or replace function public.block_guard_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.pair_blocked(new.buyer_id, new.seller_id) then
    raise exception 'You can''t exchange messages with this person.';
  end if;
  return new;
end $$;
drop trigger if exists trg_block_guard_conversation on public.conversations;
create trigger trg_block_guard_conversation
  before insert on public.conversations
  for each row execute function public.block_guard_conversation();

-- ---------------------------------------------------------------------------
-- 5. Pickup codes (order receipts)
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column if not exists pickup_code text not null
  default upper(substring(md5(random()::text) from 1 for 6));

-- ---------------------------------------------------------------------------
-- 6. Anti-spam rate limits (DB-enforced)
-- ---------------------------------------------------------------------------
create or replace function public.rate_limit_listings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.listings
      where seller_id = new.seller_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Daily listing limit reached (10). Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists trg_rate_limit_listings on public.listings;
create trigger trg_rate_limit_listings
  before insert on public.listings
  for each row execute function public.rate_limit_listings();

create or replace function public.rate_limit_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Slow down — you''re sending messages too fast.';
  end if;
  return new;
end $$;
drop trigger if exists trg_rate_limit_messages on public.messages;
create trigger trg_rate_limit_messages
  before insert on public.messages
  for each row execute function public.rate_limit_messages();

create or replace function public.rate_limit_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Daily report limit reached.';
  end if;
  return new;
end $$;
drop trigger if exists trg_rate_limit_reports on public.reports;
create trigger trg_rate_limit_reports
  before insert on public.reports
  for each row execute function public.rate_limit_reports();

create or replace function public.rate_limit_requests()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.requests
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Daily request limit reached (5). Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists trg_rate_limit_requests on public.requests;
create trigger trg_rate_limit_requests
  before insert on public.requests
  for each row execute function public.rate_limit_requests();

-- ---------------------------------------------------------------------------
-- 7. Admin broadcast
-- ---------------------------------------------------------------------------
create or replace function public.admin_broadcast(p_title text, p_body text)
returns int language plpgsql security definer set search_path = public as $$
declare sent int;
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  if length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'Announcement title is required.';
  end if;
  insert into public.notifications (user_id, type, title, body)
  select id, 'system', p_title, nullif(btrim(coalesce(p_body, '')), '')
  from public.profiles
  where not coalesce(is_banned, false);
  get diagnostics sent = row_count;
  insert into public.admin_audit (admin_id, action, target, detail)
  values (auth.uid(), 'broadcast', null, p_title);
  return sent;
end $$;
grant execute on function public.admin_broadcast(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Admin audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target     text,
  detail     text,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create policy admin_audit_read on public.admin_audit
  for select using (public.is_admin());
create policy admin_audit_write on public.admin_audit
  for insert with check (public.is_admin() and admin_id = auth.uid());
grant select, insert on public.admin_audit to authenticated;
create index if not exists idx_admin_audit_time on public.admin_audit (created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Client error reports (in-house error monitoring)
-- ---------------------------------------------------------------------------
create table if not exists public.client_errors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  message    text not null check (char_length(message) <= 600),
  source     text check (char_length(source) <= 300),
  stack      text check (char_length(stack) <= 2000),
  ua         text check (char_length(ua) <= 300),
  created_at timestamptz not null default now()
);
alter table public.client_errors enable row level security;
create policy client_errors_insert on public.client_errors
  for insert with check (user_id is null or user_id = auth.uid());
create policy client_errors_admin_read on public.client_errors
  for select using (public.is_admin());
create policy client_errors_admin_delete on public.client_errors
  for delete using (public.is_admin());
grant insert on public.client_errors to anon, authenticated;
grant select, delete on public.client_errors to authenticated;
create index if not exists idx_client_errors_time on public.client_errors (created_at desc);

-- flood guard: silently drop beyond 50 rows/hour per reporter
create or replace function public.rate_limit_client_errors()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.client_errors
      where coalesce(user_id::text, ua) = coalesce(new.user_id::text, new.ua)
        and created_at > now() - interval '1 hour') >= 50 then
    return null; -- swallow, never break the reporting page
  end if;
  return new;
end $$;
drop trigger if exists trg_rate_limit_client_errors on public.client_errors;
create trigger trg_rate_limit_client_errors
  before insert on public.client_errors
  for each row execute function public.rate_limit_client_errors();

-- ---------------------------------------------------------------------------
-- 10. Search indexes + moveout-season toggle
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;
create index if not exists idx_listings_title_trgm
  on public.listings using gin (title gin_trgm_ops);
create index if not exists idx_listings_desc_trgm
  on public.listings using gin (description gin_trgm_ops);

insert into public.site_settings (key, value)
values ('moveout', '{"active": false}'::jsonb)
on conflict (key) do nothing;
