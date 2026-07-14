-- ============================================================================
-- 0034 — middleman launch mode (owner decision)
--
--  1. Platform fee becomes a DATA SWITCH, currently OFF: the fee trigger
--     consults site_settings key 'fees'. Nothing is deleted — flip
--     {"enabled": true} later and the whole fee machine wakes up.
--  2. Boosts + Buyer Protection are paid by manual transfer to the ADMIN's
--     GoPay/bank (details stored in site_settings 'admin_pay', editable in
--     the Control Room) with a screenshot proof attached for review:
--       boost_requests.proof_url / transactions.protection_proof_url
--  3. admin_pending_protections() + admin_confirm_protection() power the
--     Control Room 🛡️ review queue.
--  4. site_settings 'handover' — the LOKITA Handover desk (location + hours)
--     shown at checkout, editable in the Control Room.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. fee switch (default OFF for launch)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values ('fees', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;

create or replace function public.apply_platform_fee()
returns trigger language plpgsql as $$
begin
  if new.price is null or new.price <= 0 then
    new.platform_fee := 0;
    return new;
  end if;
  -- launch mode: fees off → publish at the seller's ask, fee 0
  if not coalesce((select (value->>'enabled')::boolean
                   from public.site_settings where key = 'fees'), true) then
    new.platform_fee := 0;
    return new;
  end if;
  new.platform_fee := least(4000, greatest(1000, round(new.price * 0.05)));
  new.price := new.price + new.platform_fee;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. manual payment proofs
-- ---------------------------------------------------------------------------
alter table public.boost_requests
  add column if not exists proof_url text;

alter table public.transactions
  add column if not exists protection_proof_url text;

-- boost owner may attach/replace the proof while the request is pending
drop policy if exists boost_update_own_pending on public.boost_requests;
create policy boost_update_own_pending on public.boost_requests
  for update using (seller_id = auth.uid() and status = 'pending')
  with check (seller_id = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- 3. Control Room 🛡️ protection review queue
-- ---------------------------------------------------------------------------
create or replace function public.admin_pending_protections()
returns table (id uuid, buyer_name text, item_title text, fee numeric, proof_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id,
         coalesce(p.name, 'Member'),
         coalesce(l.title, '(listing removed)'),
         t.protection_fee,
         t.protection_proof_url,
         t.created_at
  from public.transactions t
  left join public.profiles p on p.id = t.buyer_id
  left join public.listings l on l.id = t.listing_id
  where public.is_admin()
    and t.protection_enabled
    and not t.protection_paid
    and t.status <> 'cancelled'
  order by t.created_at desc
  limit 50
$$;
grant execute on function public.admin_pending_protections() to authenticated;

create or replace function public.admin_confirm_protection(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare buyer uuid;
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  update public.transactions
     set protection_paid = true
   where id = target and protection_enabled
  returning buyer_id into buyer;
  if buyer is null then
    raise exception 'Order not found or protection not chosen.';
  end if;
  insert into public.notifications (user_id, type, reference_id, title, body)
  values (buyer, 'order_update', target, '🛡️ Buyer Protection active',
          'Your payment was verified — this trade is covered by LOKITA dispute mediation.');
  insert into public.admin_audit (admin_id, action, target, detail)
  values (auth.uid(), 'protection_confirmed', target::text, null);
end $$;
grant execute on function public.admin_confirm_protection(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. handover desk + admin payment info (Control Room editable)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values ('handover', '{"location": "Union Building Room 303", "hours": "By appointment — chat the LOKITA team to arrange a time"}'::jsonb)
on conflict (key) do nothing;

insert into public.site_settings (key, value)
values ('admin_pay', '{"gopay": "", "bank_name": "", "bank_account": ""}'::jsonb)
on conflict (key) do nothing;
