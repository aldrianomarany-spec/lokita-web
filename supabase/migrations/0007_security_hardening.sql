-- ============================================================
-- LOKITA — Security hardening (audit items #5.1 and #5.3).
-- Apply after 0001–0006. Safe to re-run.
--
-- 1. Stop the public_profiles view from exposing whatsapp_number. Phone numbers
--    are PII; the app never reads another user's number (contact is in-app chat),
--    yet the old view let ANY authenticated user query it directly. Remove it.
-- 2. Make messages immutable except for is_read. The messages_update_party
--    policy let either conversation party UPDATE any message — including
--    rewriting the OTHER person's text. Lock content/sender/etc. via a trigger
--    (RLS alone can't compare old vs new), leaving only is_read editable.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rebuild public_profiles WITHOUT whatsapp_number.
--    (CREATE OR REPLACE can't drop a column, so drop + recreate. Nothing in the
--    DB depends on this view — only a grant, which we re-add.)
-- ------------------------------------------------------------
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, profile_photo_url, building, floor,
         batch_year, class_standing,
         verification_status, created_at
  from public.profiles;

grant select on public.public_profiles to authenticated;

-- ------------------------------------------------------------
-- 2. Message columns are immutable except is_read.
-- ------------------------------------------------------------
create or replace function public.protect_message_immutable_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (no auth.uid()) and admins may fix data; everyone else may
  -- only flip is_read (used by "mark conversation read").
  if auth.uid() is not null and not public.is_admin() then
    if new.content        is distinct from old.content
       or new.sender_id       is distinct from old.sender_id
       or new.conversation_id is distinct from old.conversation_id
       or new.created_at      is distinct from old.created_at then
      raise exception 'Only is_read may be changed on a message';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_messages_immutable on public.messages;
create trigger trg_messages_immutable
  before update on public.messages
  for each row execute function public.protect_message_immutable_cols();
