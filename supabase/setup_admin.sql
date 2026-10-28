-- ============================================================================
-- Setup Mr Phelix Admin Account
-- This script creates the initial super admin account
-- Email: phelixinvestment@gmail.com
-- Password: @1Phelix232
-- ============================================================================

-- Note: This needs to be run via Supabase Dashboard or CLI
-- The actual user creation must be done through Supabase Auth
-- This script assumes the user has been created and we have the UUID

-- Replace <UUID_HERE> with the actual UUID from Supabase Auth after creating the user
-- Run this after creating the user in Supabase Dashboard -> Authentication -> Users

-- Example profile creation (run after user is created in Auth):
-- insert into profiles (id, full_name, role, depot) values
--   ('<UUID_FROM_SUPABASE_AUTH>', 'Mr Phelix', 'super_admin', null);

-- For manual setup via Supabase Dashboard:
-- 1. Go to Authentication -> Users -> Add User
-- 2. Email: phelixinvestment@gmail.com
-- 3. Password: @1Phelix232
-- 4. Auto Confirm User: Yes
-- 5. Copy the UUID from the user list
-- 6. Run the insert statement above with the actual UUID