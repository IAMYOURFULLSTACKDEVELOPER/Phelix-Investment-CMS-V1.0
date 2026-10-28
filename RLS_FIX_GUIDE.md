# 🔧 RLS Policy Fix - Urgent

## Problem
You're getting this error when creating evacuation documents:
```
new row violates row-level security policy for table 'evacuation_tracking'
```

This happens because the database trigger tries to insert tracking data, but the RLS policy blocks it.

## Solution

Run this quick fix in your Supabase SQL Editor:

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" → "New query"

### Step 2: Run the Fix
1. Open the file: `supabase/08_fix_rls_policies.sql`
2. Copy the entire content
3. Paste it into the SQL Editor
4. Click "Run"
5. Wait for success message

### Step 3: Test
1. Go back to your application
2. Try creating an evacuation document again
3. It should work now!

## What This Fix Does

1. **Adds service role permissions** - Allows database triggers to insert/update tracking data
2. **Updates the trigger function** - Uses `SECURITY DEFINER` to bypass RLS for the trigger
3. **Recreates the trigger** - Ensures it uses the updated function

## Why This Happened

The original RLS policies only allowed `super_admin` to insert into `evacuation_tracking`. But when an evacuation officer creates a record, the trigger (running as the officer) tries to insert tracking data, which gets blocked by RLS.

The fix allows the `service_role` (which triggers use) to bypass these restrictions while keeping the regular user restrictions in place.

## Verification

After running the fix:
1. ✅ You should be able to create evacuation documents without errors
2. ✅ The tracking data should be automatically populated
3. ✅ The quota counts should update automatically
4. ✅ Super admin can still view all tracking data

## If Issues Persist

If you still see errors after running the fix:
1. Check that the SQL executed successfully
2. Verify the trigger exists in Database → Triggers
3. Try creating a new evacuation record
4. Check the Supabase logs for detailed error messages

## Need Help?

Refer to `SUPABASE_MIGRATION_GUIDE.md` for more detailed troubleshooting.
