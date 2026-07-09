-- ============================================================
-- LOKITA — Prototype verification: auto-grant "Dorm-Verified".
-- Apply after 0001–0009. Safe to re-run.
--
-- There is no admin review UI yet, so verification_status stayed 'pending'
-- forever and the badge never appeared. For the prototype, uploading a student
-- ID document auto-verifies the profile.
--
-- Implementation note: the privileged-cols guard blocks users from touching
-- verification_status, so the auto-grant must happen INSIDE that same guard
-- function (a separate trigger's change would be rejected by it). We replace
-- protect_profile_privileged_cols with a version that (a) performs the
-- auto-verify itself and (b) still blocks any direct user tampering.
-- Swap this for a real admin review flow before production.
-- ============================================================
create or replace function public.protect_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auto_verified boolean := false;
begin
  -- PROTOTYPE auto-verify: newly uploading a student ID grants the badge.
  if new.verification_doc_url is not null
     and new.verification_doc_url is distinct from old.verification_doc_url
     and old.verification_status = 'pending'
     and new.verification_status = 'pending' then
    new.verification_status := 'verified';
    auto_verified := true;
  end if;

  -- service_role (backend) has no auth.uid() → allow. Admins → allow.
  -- Everyone else may not touch privileged columns (except the auto-verify
  -- transition this function itself just performed).
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or (new.verification_status is distinct from old.verification_status and not auto_verified)
       or new.is_banned is distinct from old.is_banned then
      raise exception 'You may not modify role, verification_status, or is_banned';
    end if;
  end if;

  new.updated_at = now();
  return new;
end $$;

-- (trigger trg_profiles_protect from 0001 already points at this function)

-- Retroactively verify anyone who uploaded an ID while review didn't exist.
update public.profiles
   set verification_status = 'verified'
 where verification_doc_url is not null
   and verification_status = 'pending';
