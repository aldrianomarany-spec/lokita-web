-- ============================================================
-- LOKITA — Section 4 (Messages + Notifications): auto-generate real
-- notifications from real events, and enable realtime on conversations.
-- Apply after 0001–0004. Safe to re-run.
--
-- Notifications are inserted by SECURITY DEFINER triggers (users have no INSERT
-- policy on notifications, so only these definer functions / service_role can
-- create them — exactly what we want).
-- ============================================================

-- ------------------------------------------------------------
-- 1. New message  → notify the receiver (the other conversation party)
-- ------------------------------------------------------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv       public.conversations%rowtype;
  receiver   uuid;
  sender_name text;
begin
  select * into conv from public.conversations where id = new.conversation_id;
  if conv.id is null then return new; end if;
  receiver := case when new.sender_id = conv.buyer_id then conv.seller_id else conv.buyer_id end;
  if receiver is null or receiver = new.sender_id then return new; end if;
  select name into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, type, reference_id, title, body)
  values (
    receiver,
    'new_message',
    new.conversation_id,
    'New message from ' || coalesce(sender_name, 'a neighbour'),
    left(new.content, 120)
  );
  return new;
end $$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ------------------------------------------------------------
-- 2. Order placed / status change → notify the counterparty
-- ------------------------------------------------------------
create or replace function public.notify_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_title text;
  recipient  uuid;
  msg        text;
begin
  select title into item_title from public.listings where id = new.listing_id;
  item_title := coalesce(item_title, 'your item');

  if TG_OP = 'INSERT' then
    -- a buyer placed an order → tell the seller
    recipient := new.seller_id;
    msg := 'New order for "' || item_title || '" — awaiting your drop-off.';
  elsif new.status is distinct from old.status then
    if new.status = 'dropped_off' then
      recipient := new.buyer_id;  -- tell buyer it's ready
      msg := '"' || item_title || '" was dropped off — ready for pickup.';
    elsif new.status = 'completed' then
      recipient := new.seller_id; -- tell seller it's done
      msg := '"' || item_title || '" was picked up. Trade complete!';
    elsif new.status = 'cancelled' then
      -- notify whichever party did NOT trigger it; default to seller
      recipient := new.seller_id;
      msg := 'The order for "' || item_title || '" was cancelled.';
    else
      return new;
    end if;
  else
    return new;
  end if;

  if recipient is not null then
    insert into public.notifications (user_id, type, reference_id, title, body)
    values (recipient, 'order_update', new.id, 'Order update', msg);
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_order on public.transactions;
create trigger trg_notify_on_order
  after insert or update on public.transactions
  for each row execute function public.notify_on_order();

-- ------------------------------------------------------------
-- 3. Price drop → notify everyone who wishlisted the listing
-- ------------------------------------------------------------
create or replace function public.notify_on_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price < old.price then
    insert into public.notifications (user_id, type, reference_id, title, body)
    select w.user_id, 'price_drop', new.id, 'Price drop on a saved item',
           '"' || new.title || '" is now Rp ' || to_char(new.price, 'FM999,999,999') || '.'
    from public.wishlist w
    where w.listing_id = new.id and w.user_id <> new.seller_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_price_drop on public.listings;
create trigger trg_notify_on_price_drop
  after update of price on public.listings
  for each row execute function public.notify_on_price_drop();

-- ------------------------------------------------------------
-- 4. Realtime: conversations (messages + notifications already added in 0004)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
