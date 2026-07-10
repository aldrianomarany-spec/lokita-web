-- ============================================================
-- LOKITA — Housekeeping: keep the database lean. Apply after 0001–0012.
-- Safe to re-run.
--
-- Auto-purges data that only accumulates:
--   * read notifications older than 30 days
--   * any notification older than 90 days
--   * fulfilled/closed requests older than 30 days
-- Runs opportunistically (statement-level trigger on notification inserts —
-- notifications are created on every message/order event, so cleanup happens
-- steadily without pg_cron). Online presence uses Supabase Realtime Presence
-- and stores NOTHING in the database.
-- ============================================================
create or replace function public.cleanup_old_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
   where is_read and created_at < now() - interval '30 days';
  delete from public.notifications
   where created_at < now() - interval '90 days';
  delete from public.requests
   where status <> 'open' and created_at < now() - interval '30 days';
  return null;
end $$;

drop trigger if exists trg_cleanup_old_data on public.notifications;
create trigger trg_cleanup_old_data
  after insert on public.notifications
  for each statement execute function public.cleanup_old_data();

-- speeds up the age-based deletes
create index if not exists idx_notifications_created on public.notifications (created_at);
