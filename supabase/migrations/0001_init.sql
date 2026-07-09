-- ============================================================
-- LOKITA — Step 1 foundation: schema, triggers, indexes, RLS
-- Apply in the Supabase SQL editor (or `supabase db push`) BEFORE 0002_storage.sql.
--
-- Design decisions (confirmed):
--  * Credentials live in Supabase's auth.users. This "profiles" table holds
--    app data and is keyed 1:1 to auth.users(id). No password_hash / google_id.
--  * Reviews are bidirectional: one per reviewer per completed transaction.
--  * Privileged columns (role, verification_status, is_banned) are NOT
--    self-editable — locked by a trigger; only admins / service_role change them.
-- ============================================================

-- gen_random_uuid() is available on Supabase by default (pgcrypto).

-- ============================================================
-- PROFILES  (1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text unique,
  name                text not null,
  profile_photo_url   text,
  student_id_number   text,
  whatsapp_number     text,
  building            text check (building in ('thomas','union')),
  floor               text check (floor in ('ground','t1','t2','t3','u2','u3')),
  room_number         text,
  batch_year          int,
  class_standing      text check (class_standing in ('freshman','sophomore','junior','senior')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verification_doc_url text,
  role                text not null default 'user' check (role in ('user','admin')),
  is_banned           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Helper: is the current request an admin?  (SECURITY DEFINER so it can read the
-- profiles row regardless of RLS; service_role → auth.uid() is null.) Defined
-- after profiles so its SQL body resolves at creation time.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-touch updated_at on any row update (reused by listings too).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Auto-create a profile row when a new auth user signs up.
-- `name` comes from signUp options.data.name; falls back to the email local-part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent non-admins from escalating privilege / self-verifying / self-unbanning.
create or replace function public.protect_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (backend) has no auth.uid() → allow. Admins → allow.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.verification_status is distinct from old.verification_status
       or new.is_banned is distinct from old.is_banned then
      raise exception 'You may not modify role, verification_status, or is_banned';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_cols();

-- ============================================================
-- LISTINGS
-- ============================================================
create table public.listings (
  id                   uuid primary key default gen_random_uuid(),
  seller_id            uuid not null references public.profiles(id) on delete cascade,
  title                text not null,
  description          text,
  price                numeric(12,2) not null check (price >= 0),
  category             text check (category in ('furniture','electronics','appliances','clothes','books','bundles','others')),
  condition            text,
  is_graduation_bundle boolean not null default false,
  status               text not null default 'active' check (status in ('active','sold','removed','flagged')),
  building             text check (building in ('thomas','union')),
  floor                text check (floor in ('ground','t1','t2','t3','u2','u3')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_listings_touch
  before update on public.listings
  for each row execute function public.touch_updated_at();

create table public.listing_photos (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  photo_url  text not null,
  sort_order int not null default 0
);

-- ============================================================
-- WISHLIST
-- ============================================================
create table public.wishlist (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ============================================================
-- TRANSACTIONS  (history preserved on account removal via SET NULL)
-- ============================================================
create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid references public.listings(id) on delete set null,
  buyer_id          uuid references public.profiles(id) on delete set null,
  seller_id         uuid references public.profiles(id) on delete set null,
  payment_method    text check (payment_method in ('cod','qris')),
  payment_status    text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  qris_reference_id text,
  pickup_method     text check (pickup_method in ('meet_in_person','trusted_handoff','security_post')),
  status            text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

-- ============================================================
-- REVIEWS  (bidirectional: one per reviewer per transaction, counterparty only)
-- ============================================================
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  reviewer_id    uuid references public.profiles(id) on delete set null,
  reviewee_id    uuid references public.profiles(id) on delete set null,
  rating         int not null check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now(),
  unique (transaction_id, reviewer_id),
  check (reviewer_id is distinct from reviewee_id)
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  buyer_id   uuid references public.profiles(id) on delete cascade,
  seller_id  uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete set null,
  content         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text check (type in ('new_message','item_update','price_drop','order_update','system')),
  reference_id uuid,               -- polymorphic: listing/transaction/message id (no FK)
  title        text not null,
  body         text,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- REPORTS / MODERATION
-- ============================================================
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text check (target_type in ('user','listing','message')),
  target_id   uuid not null,       -- polymorphic (no FK)
  reason      text not null,
  status      text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES  (FKs + hot filters)
-- ============================================================
create index idx_listings_status_category on public.listings (status, category);
create index idx_listings_building_floor   on public.listings (building, floor);
create index idx_listings_seller           on public.listings (seller_id);
create index idx_listings_created          on public.listings (created_at desc);
create index idx_listing_photos_listing    on public.listing_photos (listing_id);
create index idx_wishlist_listing          on public.wishlist (listing_id);
create index idx_tx_buyer                  on public.transactions (buyer_id);
create index idx_tx_seller                 on public.transactions (seller_id);
create index idx_tx_listing                on public.transactions (listing_id);
create index idx_reviews_reviewee          on public.reviews (reviewee_id);
create index idx_conversations_buyer       on public.conversations (buyer_id);
create index idx_conversations_seller      on public.conversations (seller_id);
create index idx_messages_conv_time        on public.messages (conversation_id, created_at);
create index idx_notifications_user_unread on public.notifications (user_id, is_read);

-- ============================================================
-- PUBLIC PROFILE VIEW
-- Base `profiles` select is locked to own-row/admin (protects PII like
-- student_id_number, email, room_number, verification_doc_url). This view
-- exposes only the safe, publicly-needed columns (incl. whatsapp for contact)
-- and — being owned by a privileged role — bypasses the base-table RLS.
-- ============================================================
create view public.public_profiles as
  select id, name, profile_photo_url, building, floor,
         batch_year, class_standing, whatsapp_number,
         verification_status, created_at
  from public.profiles;

-- Authenticated-only: browsing (and seeing seller WhatsApp) requires login.
grant select on public.public_profiles to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.listings      enable row level security;
alter table public.listing_photos enable row level security;
alter table public.wishlist      enable row level security;
alter table public.transactions  enable row level security;
alter table public.reviews       enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;
alter table public.reports       enable row level security;

-- ---------- profiles ----------
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin())
             with check (id = auth.uid() or public.is_admin());

-- ---------- listings ----------
create policy listings_select_visible on public.listings
  for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy listings_insert_own on public.listings
  for insert with check (seller_id = auth.uid());
create policy listings_update_own on public.listings
  for update using (seller_id = auth.uid() or public.is_admin())
             with check (seller_id = auth.uid() or public.is_admin());
create policy listings_delete_own on public.listings
  for delete using (seller_id = auth.uid() or public.is_admin());

-- ---------- listing_photos ----------
create policy listing_photos_select on public.listing_photos
  for select using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'active' or l.seller_id = auth.uid() or public.is_admin())
  ));
create policy listing_photos_write on public.listing_photos
  for all using (exists (
    select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()
  )) with check (exists (
    select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()
  ));

-- ---------- wishlist ----------
create policy wishlist_own on public.wishlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- transactions ----------
create policy tx_select_party on public.transactions
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy tx_insert_buyer on public.transactions
  for insert with check (buyer_id = auth.uid());
create policy tx_update_party on public.transactions
  for update using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin())
             with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

-- ---------- reviews ----------
-- Public read (a seller's track record). Insert only by a party to a COMPLETED
-- transaction, reviewing the counterparty.
create policy reviews_select_all on public.reviews
  for select using (true);
create policy reviews_insert_after_completed on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and t.status = 'completed'
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
        and reviewee_id = case when t.buyer_id = auth.uid() then t.seller_id else t.buyer_id end
    )
  );
create policy reviews_update_own on public.reviews
  for update using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy reviews_delete_own on public.reviews
  for delete using (reviewer_id = auth.uid() or public.is_admin());

-- ---------- conversations ----------
create policy conversations_select_party on public.conversations
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy conversations_insert_buyer on public.conversations
  for insert with check (buyer_id = auth.uid());

-- ---------- messages ----------
create policy messages_select_party on public.messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
create policy messages_insert_sender on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
create policy messages_update_party on public.messages
  for update using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

-- ---------- notifications ----------
-- Read/flag your own. Creation is done by triggers / the service_role (which
-- bypasses RLS), so there is intentionally no user INSERT policy.
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- reports ----------
create policy reports_insert_self on public.reports
  for insert with check (reporter_id = auth.uid());
create policy reports_select_own_or_admin on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy reports_update_admin on public.reports
  for update using (public.is_admin()) with check (public.is_admin());
