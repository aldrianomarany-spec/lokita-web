-- ============================================================================
-- 0033 — fix: owners couldn't delete a listing once it had order history
--
-- Deleting a listing makes its transactions keep a NULL reference
-- (FK: on delete set null) so trade history survives. But that cascade
-- UPDATE fires protect_transaction_update INSIDE the deleting user's
-- session, and the trigger rejected ANY listing_id change → the whole
-- delete failed with "These transaction fields cannot be changed".
--
-- Fix: listing_id may transition to NULL (the deletion cascade); changing
-- it to any OTHER value is still blocked, and everything else is unchanged.
-- ============================================================================

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
       -- listing_id → NULL is the listing-deletion cascade (allowed);
       -- pointing it at a different listing stays forbidden
       or (new.listing_id is distinct from old.listing_id and new.listing_id is not null)
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
