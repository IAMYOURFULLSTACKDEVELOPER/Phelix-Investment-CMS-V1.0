# 🔧 Dashboard Not Showing Evacuation Records - Fix

## Problem
Evacuation notifications are being created (showing evacuations happened), but:
- ❌ Total Evacuations shows 0
- ❌ Today shows 0
- ❌ This Week shows 0
- ❌ Active Officers shows 0
- ❌ Table shows "No evacuation records found"

## Root Cause
The RLS (Row Level Security) policies are preventing the super admin from reading the `evacuation_records` table, even though they can read the notifications. The policies are using a function (`public.is_super_admin()`) that may not be working correctly.

## Solution

Run this fix in your Supabase SQL Editor:

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" → "New query"

### Step 2: Run the Fix
1. Open the file: `supabase/09_fix_evacuation_rls.sql`
2. Copy the entire content
3. Paste it into the SQL Editor
4. Click "Run"
5. Wait for success message

### Step 3: Test
1. Go back to your application
2. Refresh the Super Admin Dashboard page
3. You should now see:
   - ✅ Total Evacuations count
   - ✅ Today's count
   - ✅ This Week's count
   - ✅ Active Officers count
   - ✅ Evacuation records in the table

## What This Fix Does

1. **Replaces function-based checks with direct role checks** - More reliable
2. **Uses EXISTS subqueries** to check the user's role directly from the profiles table
3. **Fixes both evacuation_records and evacuation_notifications** policies
4. **Maintains security** - Still only allows appropriate access

## Why This Happened

The original policies used `public.is_super_admin()` function. This function might:
- Not exist in your database
- Have incorrect permissions
- Return unexpected results

The fix uses direct SQL queries to check the role, which is more reliable.

## Verification

After running the fix, verify:

1. **Dashboard Statistics**:
   - Total Evacuations should show a number > 0
   - Today should show today's evacuations
   - This Week should show this week's evacuations
   - Active Officers should show the number of officers

2. **Evacuation Table**:
   - Should show all evacuation records
   - Should display officer names
   - Should show container details

3. **Filters**:
   - Filter by Officer should show officer names
   - Filter by Date should work correctly

## If Still Not Working

1. **Check if fix ran successfully**:
   - Look for any errors in the SQL Editor output
   - Verify the policy was created

2. **Check your user's role**:
   - Go to Supabase Dashboard → Table Editor
   - Open the `profiles` table
   - Find your user
   - Verify `role` is set to `super_admin`

3. **Check for data**:
   - Go to Supabase Dashboard → Table Editor
   - Open the `evacuation_records` table
   - Verify records exist
   - If no records exist, the issue is with record creation, not reading

4. **Check browser console**:
   - Open browser console (F12)
   - Look for any error messages
   - Check for network errors in the Network tab

## Need More Help?

- Check `URGENT_FIX_GUIDE.md` for RLS-related issues
- Check `SUPABASE_MIGRATION_GUIDE.md` for database issues
- Check browser console for detailed error messages
