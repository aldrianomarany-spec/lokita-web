-- 0024 — Control Room: permanently delete a member account.
-- SECURITY DEFINER so the function (owned by postgres) may delete from
-- auth.users; the row cascades to public.profiles → listings → photos/wishlist.
-- Transactions, reviews and messages keep their rows with the party nulled
-- (on delete set null) so trade history and revenue stay intact.
-- Guard rails: admins only, no self-delete, admins cannot delete admins.
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins may delete accounts';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception 'Admin accounts cannot be deleted from the Control Room';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
