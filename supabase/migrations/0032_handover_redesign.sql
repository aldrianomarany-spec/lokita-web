-- ============================================================================
-- 0032 — handover redesign: every payment happens at handover
--
--  * meetup_spot        — Meet in person now picks a preset campus spot at
--                         checkout instead of "figure it out in chat"
--  * dropoff_photo_url  — Security Post / LOKITA Handover drop-offs attach a
--                         photo proof the buyer can see
--  (pickup_method 'trusted_handoff' is re-purposed as 📦 LOKITA Handover —
--   the team holds the item; no schema change needed for that.)
-- ============================================================================

alter table public.transactions
  add column if not exists meetup_spot text check (char_length(meetup_spot) <= 60);

alter table public.transactions
  add column if not exists dropoff_photo_url text;
