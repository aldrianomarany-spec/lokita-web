-- ============================================================
-- LOKITA — RLS hardening (audit items #5.4 and #5.5).
-- Apply after 0001–0008. Safe to re-run.
--
-- 1. conversations: a buyer could previously insert a conversation with an
--    arbitrary seller_id / listing_id. Require the row to reference a real
--    listing actually owned by that seller, and forbid self-conversations.
-- 2. transactions: either party could rewrite structural fields or move a
--    finalised order. Lock the parties/listing, forbid changes once
--    completed/cancelled, and enforce who may trigger each transition
--    (seller drops off, buyer confirms pickup — matching the app).
-- ============================================================

-- ------------------------------------------------------------
-- 1. conversations insert must reference a genuine listing+seller
-- ------------------------------------------------------------
drop policy if exists conversations_insert_buyer on public.conversations;
create policy conversations_insert_buyer on public.conversations
  for insert with check (
    buyer_id = auth.uid()
    and buyer_id is distinct from seller_id
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id
        and l.seller_id = conversations.seller_id
    )
  );

-- ------------------------------------------------------------
-- 2. transactions: structural immutability + valid transitions
-- ------------------------------------------------------------
create or replace function public.protect_transaction_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (no auth.uid()) and admins bypass; everyone else is constrained.
  if auth.uid() is not null and not public.is_admin() then
    -- structural fields never change after creation
    if new.buyer_id   is distinct from old.buyer_id
       or new.seller_id  is distinct from old.seller_id
       or new.listing_id is distinct from old.listing_id
       or new.created_at is distinct from old.created_at then
      raise exception 'These transaction fields cannot be changed';
    end if;

    -- a finalised order is locked
    if old.status in ('completed','cancelled')
       and new.status is distinct from old.status then
      raise exception 'This order is already finalised';
    end if;

    -- enforce who may drive each transition (matches the app's buttons)
    if new.status is distinct from old.status then
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
