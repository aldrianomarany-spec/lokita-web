-- ============================================================
-- LOKITA — Step 1: Storage buckets + policies
-- Apply AFTER 0001_init.sql (needs public.is_admin()).
--
-- Path convention (enforced by policy): every object is stored under a folder
-- named after the owner's user id, e.g.
--   listing-photos/<uid>/<listing_id>/photo.jpg
--   profile-photos/<uid>/avatar.jpg
--   verification-docs/<uid>/student-id.jpg
-- storage.foldername(name)[1] is that first path segment.
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('listing-photos',    'listing-photos',    true),   -- public read (served via CDN)
  ('profile-photos',    'profile-photos',    true),   -- public read
  ('verification-docs', 'verification-docs', false)   -- PRIVATE: owner + admin only
on conflict (id) do nothing;

-- Supabase enables RLS on storage.objects by default; policies below govern the
-- Storage API. Public buckets are still readable through their public URLs.

-- ---------- listing-photos: public read, owner-folder writes ----------
create policy "listing_photos_public_read" on storage.objects
  for select using (bucket_id = 'listing-photos');

create policy "listing_photos_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_photos_owner_modify" on storage.objects
  for update using (
    bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'listing-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------- profile-photos: public read, owner-folder writes ----------
create policy "profile_photos_public_read" on storage.objects
  for select using (bucket_id = 'profile-photos');

create policy "profile_photos_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_owner_modify" on storage.objects
  for update using (
    bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'profile-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------- verification-docs: PRIVATE (owner + admin only) ----------
create policy "verification_docs_owner_read" on storage.objects
  for select using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "verification_docs_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_docs_owner_modify" on storage.objects
  for update using (
    bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verification_docs_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
