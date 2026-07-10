-- ============================================================
-- LOKITA — Seller confirmation step in the order flow. Apply after 0001–0014.
-- Safe to re-run.
--
-- New lifecycle:  pending → paid → dropped_off → completed  (+ cancelled)
--   pending      buyer placed the order (and sent payment) — the SELLER must
--                confirm the money arrived and accept before anything proceeds
--   paid         seller accepted / payment confirmed — awaiting drop-off
--   (rest unchanged)
-- The listing is still reserved at order time (prevents double-buying) and is
-- freed automatically if the order is declined/cancelled.
-- ============================================================

-- 1. status: allow 'pending' again and make it the default
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check
  check (status in ('pending', 'paid', 'dropped_off', 'completed', 'cancelled'));
alter table public.transactions alter column status set default 'pending';

-- 2. transition rules: who may move an order where
create or replace function public.protect_transaction_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.buyer_id   is distinct from old.buyer_id
       or new.seller_id  is distinct from old.seller_id
       or new.listing_id is distinct from old.listing_id
       or new.created_at is distinct from old.created_at then
      raise exception 'These transaction fields cannot be changed';
    end if;
    if old.status in ('completed','cancelled')
       and new.status is distinct from old.status then
      raise exception 'This order is already finalised';
    end if;
    if new.status is distinct from old.status then
      if new.status = 'paid' and auth.uid() <> old.seller_id then
        raise exception 'Only the seller can confirm and accept the order';
      end if;
      if new.status = 'dropped_off' and auth.uid() <> old.seller_id then
        raise exception 'Only the seller can mark drop-off';
      end if;
      if new.status = 'completed' and auth.uid() <> old.buyer_id then
        raise exception 'Only the buyer can confirm pickup';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_transaction_protect on public.transactions;
create trigger trg_transaction_protect
  before update on public.transactions
  for each row execute function public.protect_transaction_update();

-- 3. notifications for every step (re-created in full — idempotent)
create or replace function public.notify_on_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_title text;
begin
  select title into item_title from public.listings where id = new.listing_id;
  item_title := coalesce(item_title, 'your item');

  if TG_OP = 'INSERT' then
    -- buyer placed an order → seller must confirm payment & accept
    insert into public.notifications (user_id, type, reference_id, title, body)
    values (new.seller_id, 'order_update', new.id, 'New order — action needed',
            'Someone ordered "' || item_title || '". Check the payment arrived, then confirm & accept in My Orders.');
  elsif new.status is distinct from old.status then
    if new.status = 'paid' then
      insert into public.notifications (user_id, type, reference_id, title, body)
      values (new.buyer_id, 'order_update', new.id, 'Order accepted ✓',
              'The seller confirmed your payment for "' || item_title || '" — it will be dropped off soon.');
    elsif new.status = 'dropped_off' then
      insert into public.notifications (user_id, type, reference_id, title, body)
      values (new.buyer_id, 'order_update', new.id, 'Ready for pickup',
              '"' || item_title || '" was dropped off — collect it at the Security Post.');
    elsif new.status = 'completed' then
      insert into public.notifications (user_id, type, reference_id, title, body)
      values (new.seller_id, 'order_update', new.id, 'Trade complete 🎉',
              '"' || item_title || '" was picked up. Don''t forget to review your buyer.');
    elsif new.status = 'cancelled' then
      -- tell both parties; whoever cancelled simply ignores theirs
      insert into public.notifications (user_id, type, reference_id, title, body)
      values (new.seller_id, 'order_update', new.id, 'Order cancelled',
              'The order for "' || item_title || '" was cancelled. The listing is live again.'),
             (new.buyer_id, 'order_update', new.id, 'Order cancelled',
              'The order for "' || item_title || '" was cancelled.');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_order on public.transactions;
create trigger trg_notify_on_order
  after insert or update on public.transactions
  for each row execute function public.notify_on_order();

-- 4. message notifications — re-applied verbatim so they're guaranteed present
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
  values (receiver, 'new_message', new.conversation_id,
          'New message from ' || coalesce(sender_name, 'a neighbour'),
          left(new.content, 120));
  return new;
end $$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute function public.notify_on_message();
