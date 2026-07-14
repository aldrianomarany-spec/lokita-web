-- ============================================================================
-- 0031 — real QRIS collection of LOKITA's own fees (Midtrans, Option E)
--
-- Items keep moving buyer→seller directly. The gateway collects ONLY money
-- that belongs to the platform:
--   🚀 boost fees       — paid when requesting a boost; the webhook approves
--                         the boost + features the listing automatically
--   🛡️ protection fees  — paid right after checkout; the webhook flips
--                         transactions.protection_paid
--
-- Midtrans references live next to the rows they pay for (no new table):
-- the webhook cross-checks them exactly like order payments (0016 pattern).
-- ============================================================================

alter table public.transactions
  add column if not exists protection_paid boolean not null default false;
alter table public.transactions
  add column if not exists protection_ref text;

alter table public.boost_requests
  add column if not exists midtrans_ref text;
