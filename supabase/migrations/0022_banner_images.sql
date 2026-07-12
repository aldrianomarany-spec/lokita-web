-- 0022 — banner images: admins can attach a photo to a promotion banner;
-- it fills the right half of the black homepage slot. Files live in the
-- public listing-photos bucket under the admin's own folder (existing
-- storage RLS already permits that path).
alter table public.banners add column if not exists image_url text;
