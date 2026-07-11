-- ============================================================================
-- 0018 — privacy hardening: stop exposing WhatsApp numbers
--
-- public_profiles is readable by every logged-in member AND (since 0011,
-- for guest browsing) by anonymous visitors. It included whatsapp_number —
-- but no UI surface ever shows another member's WhatsApp (all contact is
-- in-app chat), so it was pure exposure: anyone could harvest every
-- student's phone number from the API.
--
-- Recreate the view without it. A member's own WhatsApp stays visible to
-- them (own-row select on profiles) and editable in Edit Profile.
-- ============================================================================

drop view if exists public.public_profiles;

create view public.public_profiles as
  select id, name, profile_photo_url, building, floor,
         batch_year, class_standing,
         verification_status, created_at
  from public.profiles;

-- same audiences as before (members + guest browsing), minus the phone data
grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;
