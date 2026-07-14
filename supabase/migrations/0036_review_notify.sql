-- ============================================================================
-- 0036 — seller review notifications
--
--  Consignment follow-up: the seller must be able to TRACK their submission.
--  When the admin decides on a pending listing, tell the seller immediately
--  (the notification rides the existing realtime + web-push chain):
--    pending → active   = "approved, you're live"
--    pending → removed  = "declined — check chat / collect the item"
--  Nothing fires for ordinary moderation of already-active listings.
-- ============================================================================

create or replace function public.notify_seller_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'active' then
    insert into public.notifications (user_id, type, reference_id, title, body)
    values (new.seller_id, 'item_update', new.id,
            '✅ "' || new.title || '" is live!',
            'The LOKITA desk received your item and approved the listing. Buyers can see it now — we''ll keep it safe until it sells.');
  elsif old.status = 'pending' and new.status = 'removed' then
    insert into public.notifications (user_id, type, reference_id, title, body)
    values (new.seller_id, 'item_update', new.id,
            '📦 "' || new.title || '" was not accepted',
            'The LOKITA desk declined this listing. Check your chat for the reason — the team may ask you to adjust it and post again.');
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_seller_review on public.listings;
create trigger trg_notify_seller_review
  after update on public.listings
  for each row execute function public.notify_seller_review();
