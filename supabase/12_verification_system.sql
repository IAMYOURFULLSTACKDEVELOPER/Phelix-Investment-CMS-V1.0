-- ============================================================================
-- PHELIX INVESTMENT CMS — User Verification System
-- Adds verification workflow where super admin must approve new accounts
-- before users can sign in
-- ============================================================================
-- IMPORTANT: This system assumes email confirmation is DISABLED in Supabase
-- To disable email confirmation, run this in Supabase SQL Editor:
-- alter table auth.users alter column email_confirmed set default true;
-- Or set "Disable email confirmation" in Supabase Dashboard > Authentication > Providers > Email
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add verification_status column to profiles table
-- ----------------------------------------------------------------------------
alter table profiles
add column if not exists verification_status text
  check (verification_status in ('pending', 'approved', 'rejected'))
  default 'pending';

-- Set existing profiles to 'approved' so they can continue to work
update profiles
set verification_status = 'approved'
where verification_status is null;

-- ----------------------------------------------------------------------------
-- 2. Add rejection_reason column for rejected accounts
-- ----------------------------------------------------------------------------
alter table profiles
add column if not exists rejection_reason text;

-- ----------------------------------------------------------------------------
-- 3. Add verified_at timestamp
-- ----------------------------------------------------------------------------
alter table profiles
add column if not exists verified_at timestamptz;

-- ----------------------------------------------------------------------------
-- 4. Add verified_by column to track which admin approved the account
-- ----------------------------------------------------------------------------
alter table profiles
add column if not exists verified_by uuid references profiles(id);

-- ----------------------------------------------------------------------------
-- 5. Update the handle_new_user function to set pending status
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role app_role;
begin
  -- Safely extract and cast the role from metadata
  begin
    user_role := (new.raw_user_meta_data->>'role')::app_role;
  exception when others then
    user_role := 'fuel_attendant'::app_role; -- default role on error
  end;

  insert into public.profiles (id, full_name, role, verification_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    user_role,
    'pending'  -- All new accounts start as pending
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Create function to approve a user account
-- ----------------------------------------------------------------------------
create or replace function approve_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    verification_status = 'approved',
    verified_at = now(),
    verified_by = auth.uid(),
    rejection_reason = null
  where id = p_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Create function to reject a user account
-- ----------------------------------------------------------------------------
create or replace function reject_user_account(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    verification_status = 'rejected',
    rejection_reason = p_reason,
    verified_at = now(),
    verified_by = auth.uid()
  where id = p_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Update RLS policies to allow super admin to manage verification status
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_admin_write" on profiles;

create policy "profiles_admin_write" on profiles
  for update using (is_super_admin())
  with check (is_super_admin());

-- ----------------------------------------------------------------------------
-- 9. Create a function to get pending verifications with emails
-- ----------------------------------------------------------------------------
create or replace function get_pending_verifications()
returns table (
  id uuid,
  full_name text,
  email text,
  role app_role,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    p.full_name,
    au.email,
    p.role,
    p.created_at
  from profiles p
  join auth.users au on p.id = au.id
  where p.verification_status = 'pending'
  order by p.created_at desc;
$$;

-- ----------------------------------------------------------------------------
-- 10. Grant execute on the function to authenticated users
-- ----------------------------------------------------------------------------
grant execute on function get_pending_verifications() to authenticated;
