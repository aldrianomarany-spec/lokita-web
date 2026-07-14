-- ============================================================================
-- 0037 — no-show expiry support
--
--  The nightly cron (api/cron/cleanup.js) now closes consignment posts that
--  sat "pending" for 5+ days without the item ever reaching the desk, and
--  sends the seller a tailored "expired" notification. The generic decline
--  notice from 0036 must NOT also fire for those — so notify_seller_review
--  stays silent when the change comes from the service role (auth.uid() is
--  null there; every human decline goes through a signed-in admin session).
-- ============================================================================

create or replace function public.notify_seller_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'active' then
    insert into public.notifications (user_id, type, reference_id, title, body)
    values (new.seller_id, 'item_update', new.id,
            '✅ "' || new.title || '" is live!',
            'The LOKITA desk received your item and approved the listing. Buyers can see it now — we''ll keep it safe until it sells.');
  elsif old.status = 'pending' and new.status = 'removed' and auth.uid() is not null then
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
