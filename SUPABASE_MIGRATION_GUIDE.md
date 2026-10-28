# Complete Supabase Migration Guide for Phelix CMS

This guide provides step-by-step instructions to run all Supabase SQL migrations for the Phelix CMS project.

## Prerequisites

Before running the migrations, ensure you have:
1. A Supabase project created and accessible
2. Your Supabase project URL and anon key configured in `.env` file
3. Access to the Supabase Dashboard (https://supabase.com/dashboard)

## Migration Order

The migrations must be run in this specific order:

1. `01_schema.sql` - Base schema setup
2. `03_migration.sql` - Additional migrations
3. `04_audit_log_migration.sql` - Audit log setup
4. `05_audit_log_enhancements.sql` - Audit log enhancements
5. `06_evacuation_integration.sql` - Evacuation enum update (PART 1)
6. `06_evacuation_integration_part2.sql` - Evacuation tables and policies (PART 2)
7. `07_evacuation_quota_tracking.sql` - Quota and tracking system (NEW)
8. `setup_admin.sql` - Create admin user (optional)

## Step-by-Step Execution

### Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your Phelix CMS project
4. Click on **SQL Editor** in the left sidebar
5. Click **"New query"** to open a new SQL editor window

### Step 2: Run Base Schema Migration

1. Open the file: `supabase/01_schema.sql`
2. Copy the entire content of the file
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** button (or press `Ctrl + Enter`)
5. Wait for the execution to complete
6. Verify you see "Success" message at the bottom
7. **Important**: If you see any errors, note them down and troubleshoot before proceeding

### Step 3: Run Additional Migration

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/03_migration.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion and verify success

### Step 4: Run Audit Log Migration

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/04_audit_log_migration.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion and verify success

### Step 5: Run Audit Log Enhancements

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/05_audit_log_enhancements.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion and verify success

### Step 6: Run Evacuation Integration - Part 1 (Enum Update)

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/06_evacuation_integration.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion
7. **Note**: If you get an error saying "enum value already exists", that's fine! It means the value was already added. Proceed to Part 2.

### Step 7: Run Evacuation Integration - Part 2 (Tables and Policies)

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/06_evacuation_integration_part2.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion and verify success

### Step 8: Run Evacuation Quota and Tracking (NEW)

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/07_evacuation_quota_tracking.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion and verify success

### Step 9: Run Admin Setup (Optional)

1. Click **"New query"** to open a new SQL editor window
2. Open the file: `supabase/setup_admin.sql`
3. Copy the entire content of the file
4. Paste it into the SQL Editor
5. Click **"Run"** button
6. Wait for completion and verify success

**Note**: You can skip this step if you prefer to create the admin user manually through the Supabase Dashboard UI.

## Verification Steps

After running all migrations, verify the setup:

### 1. Check Tables Exist

1. In Supabase Dashboard, click on **Table Editor** in the left sidebar
2. Verify the following tables exist:
   - `profiles`
   - `accounting_entries`
   - `payments_made`
   - `workers`
   - `worker_incidents`
   - `worker_promotions`
   - `fuel_logs`
   - `evacuation_records`
   - `evacuation_notifications`
   - `evacuation_quotas`
   - `evacuation_tracking`
   - `audit_logs`

### 2. Check Functions Exist

1. In Supabase Dashboard, click on **Database** → **Functions**
2. Verify the following functions exist:
   - `container_exists`
   - `update_updated_at_column`
   - `track_evacuation_activity`
   - `update_evacuation_quotas_updated_at`

### 3. Check Triggers Exist

1. In Supabase Dashboard, click on **Database** → **Triggers**
2. Verify the following triggers exist:
   - `trigger_update_updated_at`
   - `trigger_track_evacuation_activity`
   - `trigger_update_evacuation_quotas_updated_at`
   - `notify_super_admin_on_evacuation_trigger`

### 4. Check RLS Policies

1. In Supabase Dashboard, click on **Database** → **Policies**
2. Verify policies exist for all tables
3. Ensure policies are enabled

### 5. Check Enum Values

1. In Supabase Dashboard, click on **Database** → **Types**
2. Verify the `app_role` enum includes:
   - `super_admin`
   - `accountant`
   - `operations_supervisor`
   - `fuel_attendant`
   - `evacuation_officer`

### 6. Test the Application

1. Start your development server: `npm run dev`
2. Open `http://localhost:5173`
3. Try to create a new account
4. Try to sign in
5. Verify all features work as expected

## Troubleshooting

### Error: "relation already exists"

**Cause**: The table or relation already exists from a previous migration.

**Solution**:
- If you're setting up a fresh database, drop all existing tables first
- Or, modify the SQL to use `CREATE TABLE IF NOT EXISTS` instead of `CREATE TABLE`

### Error: "enum value already exists"

**Cause**: The enum value was already added in a previous migration.

**Solution**:
- This is expected and not an error
- Proceed to the next migration step

### Error: "function already exists"

**Cause**: The function was already created in a previous migration.

**Solution**:
- Use `CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`
- Or drop the function first before recreating it

### Error: "trigger already exists"

**Cause**: The trigger was already created in a previous migration.

**Solution**:
- Use `DROP TRIGGER IF EXISTS` before creating the trigger
- Or modify the SQL to check for existence first

### Error: "permission denied"

**Cause**: You don't have sufficient permissions to create objects.

**Solution**:
- Ensure you're logged in as the database owner
- Check your Supabase project permissions
- Contact Supabase support if needed

### Error: "relation does not exist"

**Cause**: A table referenced in the migration doesn't exist.

**Solution**:
- Ensure you ran the migrations in the correct order
- Verify the previous migrations completed successfully
- Check if the table name is spelled correctly

## Clean Reset (If Needed)

If you need to start completely fresh:

### Option 1: Drop All Tables (Careful!)

⚠️ **WARNING**: This will delete all data!

```sql
-- Run this in Supabase SQL Editor
DROP TABLE IF EXISTS evacuation_tracking CASCADE;
DROP TABLE IF EXISTS evacuation_quotas CASCADE;
DROP TABLE IF EXISTS evacuation_notifications CASCADE;
DROP TABLE IF EXISTS evacuation_records CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS fuel_logs CASCADE;
DROP TABLE IF EXISTS worker_promotions CASCADE;
DROP TABLE IF EXISTS worker_incidents CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS payments_made CASCADE;
DROP TABLE IF EXISTS accounting_entries CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop the enum
DROP TYPE IF EXISTS app_role CASCADE;
```

After dropping, re-run all migrations from Step 2.

### Option 2: Create New Supabase Project

If you prefer a completely fresh start:
1. Create a new Supabase project
2. Update your `.env` file with the new project credentials
3. Run all migrations from Step 2

## Quick Reference

### Migration Files in Order:

1. ✅ `01_schema.sql` - Base schema
2. ✅ `03_migration.sql` - Additional tables
3. ✅ `04_audit_log_migration.sql` - Audit log
4. ✅ `05_audit_log_enhancements.sql` - Audit enhancements
5. ✅ `06_evacuation_integration.sql` - Evacuation enum (Part 1)
6. ✅ `06_evacuation_integration_part2.sql` - Evacuation tables (Part 2)
7. ✅ `07_evacuation_quota_tracking.sql` - Quota & tracking (NEW)
8. ✅ `setup_admin.sql` - Admin user (optional)

### Total Tables Created: 12
### Total Functions Created: 4
### Total Triggers Created: 4
### Total Enums Created: 1

## Support

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Review the browser console for frontend errors
3. Verify your `.env` file has correct credentials
4. Ensure you're running migrations in the correct order
5. Refer to `EVACUATION_SETUP.md` for evacuation-specific issues

## Success Indicators

You'll know everything is working when:
- ✅ All migrations run without errors
- ✅ All tables are visible in Table Editor
- ✅ All functions and triggers are visible in Database section
- ✅ You can create accounts in the application
- ✅ You can sign in successfully
- ✅ All features work as expected

Congratulations! Your Supabase database is now fully configured for Phelix CMS! 🎉
