-- ============================================================================
-- Migration: Update user signup trigger with error handling
-- This updates the handle_new_user function to handle role casting safely
-- ============================================================================

-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- Recreate function with improved error handling
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
  
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    user_role
  );
  return new;
end;
$$;

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure handle_new_user();