-- ============================================================================
-- 0039 — donations reviewed too + admin handover queue (owner decisions)
--
--  1. EVERY post — donations included — waits for LOKITA team approval.
--     The client now always inserts status 'pending'; the DB backstop here
--     limits 'direct' fulfillment to giveaways (paid items are desk-only).
--  2. Admin notifications tell the two pending cases apart:
--     desk item  → "bring to the desk, approve once you have it"
--     direct donation → "review the post — the giver keeps the item"
--  3. Seller approval notification matches the mode as well.
--  4. admin_pending_handovers(): one tidy queue of every paid desk order
--     (item, code, buyer, seller) so pickups never blur together.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. direct deals are for giveaways only (defense in depth)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_direct_giveaway_only()
returns trigger language plpgsql as $$
begin
  if coalesce(new.fulfillment, 'desk') = 'direct' and not coalesce(new.is_giveaway, false) then
    raise exception 'Direct deals are for Free & Donations — paid items go through the LOKITA desk.';
  end if;
  return new;
end $$;
drop trigger if exists trg_direct_giveaway_only on public.listings;
create trigger trg_direct_giveaway_only
  before insert or update on public.listings
  for each row execute function public.enforce_direct_giveaway_only();

-- ---------------------------------------------------------------------------
-- 2. admin "incoming" notification per mode
-- ---------------------------------------------------------------------------
create or replace function public.notify_admins_new_pending()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if new.status = 'pending' then
    select coalesce(name, 'A member') into who from public.profiles where id = new.seller_id;
    if new.fulfillment = 'direct' then
      insert into public.notifications (user_id, type, reference_id, title, body)
      select id, 'system', new.id,
             '💝 Donation post to review: ' || new.title,
             who || ' keeps the item and hands it over directly — check the post and approve it.'
      from public.profiles where role = 'admin';
    else
      insert into public.notifications (user_id, type, reference_id, title, body)
      select id, 'system', new.id,
             '📦 Item incoming: ' || new.title,
             who || ' will bring it to the desk — approve the listing once you have it.'
      from public.profiles where role = 'admin';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. seller approval notification per mode
-- ---------------------------------------------------------------------------
create or replace function public.notify_seller_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'active' then
    if new.fulfillment = 'direct' then
      insert into public.notifications (user_id, type, reference_id, title, body)
      values (new.seller_id, 'item_update', new.id,
              '✅ "' || new.title || '" is live!',
              'The LOKITA team approved your post. Neighbours who want it will chat you — you arrange the handover.');
    else
      insert into public.notifications (user_id, type, reference_id, title, body)
      values (new.seller_id, 'item_update', new.id,
              '✅ "' || new.title || '" is live!',
              'The LOKITA desk received your item and approved the listing. Buyers can see it now — we''ll keep it safe until it sells.');
    end if;
  elsif old.status = 'pending' and new.status = 'removed' and auth.uid() is not null then
    insert into public.notifications (user_id, type, reference_id, title, body)
    values (new.seller_id, 'item_update', new.id,
            '📦 "' || new.title || '" was not accepted',
            'The LOKITA desk declined this listing. Check your chat for the reason — the team may ask you to adjust it and post again.');
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 4. the admin's handover queue — paid desk orders, clearly separated
-- ---------------------------------------------------------------------------
create or replace function public.admin_pending_handovers()
returns table (
  id uuid,
  item_title text,
  price numeric,
  pickup_code text,
  buyer_id uuid,
  buyer_name text,
  seller_id uuid,
  seller_name text,
  paid_at timestamptz
)
language sql security definer set search_path = public as $$
  select t.id,
         coalesce(l.title, 'Deleted item'),
         coalesce(l.price, 0),
         t.pickup_code,
         t.buyer_id,
         coalesce(pb.name, 'Member'),
         t.seller_id,
         coalesce(ps.name, 'Member'),
         t.paid_at
  from public.transactions t
  left join public.listings l on l.id = t.listing_id
  left join public.profiles pb on pb.id = t.buyer_id
  left join public.profiles ps on ps.id = t.seller_id
  where public.is_admin()
    and t.status = 'paid'
    and t.pickup_method = 'trusted_handoff'
  order by t.paid_at asc nulls last
$$;
