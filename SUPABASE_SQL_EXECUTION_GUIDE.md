# Supabase SQL Scripts - Step-by-Step Execution Guide

This guide provides the exact order to run all SQL scripts in the `supabase/` folder to enable all functionalities in the Phelix Investment CMS.

---

## Prerequisites

Before running any SQL scripts:
1. ✅ You have created a Supabase project
2. ✅ You have disabled email confirmation (Authentication → Providers → Email → Uncheck "Confirm email")
3. ✅ You are logged into the Supabase Dashboard

---

## How to Run SQL Scripts

### Method: Using Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New Query"** button
4. Open the SQL file from your project folder
5. Copy the entire content of the file
6. Paste it into the SQL Editor
7. Click **"Run"** button (or press `Ctrl+Enter`)
8. Wait for "Success" message
9. Close the query when done

---

## Execution Order

### Phase 1: Core Database Setup (REQUIRED)

These scripts must be run for the system to work at all.

#### Step 1: Core Schema
**File**: `01_schema.sql`

**What it does**:
- Creates all core tables (profiles, accounting, operations, fuel)
- Sets up roles and enums
- Implements Row-Level Security (RLS)
- Creates helper functions
- Sets up storage buckets

**How to run**:
1. Open `supabase/01_schema.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

⚠️ **CRITICAL**: This script must be run first before any other scripts.

---

### Phase 2: User Verification System (REQUIRED)

#### Step 2: Verification System
**File**: `12_verification_system.sql`

**What it does**:
- Adds payment status tracking for new user accounts
- Allows super admin to approve/reject accounts
- Sets pending status for new users
- Updates existing profiles to 'approved' for backward compatibility

**How to run**:
1. Open `supabase/12_verification_system.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

⚠️ **REQUIRED**: Run this after `01_schema.sql` to enable user account approval workflow.

---

### Phase 3: Enhanced Audit Logging (OPTIONAL but RECOMMENDED)

#### Step 3: Audit Log Enhancements
**File**: `05_audit_log_enhancements.sql`

**What it does**:
- Adds enhanced audit logging capabilities
- IP address and user agent tracking
- Better error handling
- Functions to query audit logs by action or entity

**How to run**:
1. Open `supabase/05_audit_log_enhancements.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

💡 **RECOMMENDED**: Run this for better system monitoring and security tracking.

---

### Phase 4: Evacuation System (OPTIONAL - Only if using EVAC)

Only run these scripts if you want to use the Evacuation tracking system.

#### Step 4: Evacuation Integration
**File**: `06_evacuation_integration.sql`

**What it does**:
- Creates evacuation_records table
- Creates evacuation_notifications table
- Sets up RLS policies for evacuation data
- Creates triggers for automatic notifications
- Implements audit logging for evacuations
- Creates storage bucket for evacuation documents

**How to run**:
1. Open `supabase/06_evacuation_integration.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

⚠️ **DEPENDENCY**: Must run after `01_schema.sql`.

#### Step 5: Evacuation Quota Tracking
**File**: `07_evacuation_quota_tracking.sql`

**What it does**:
- Creates evacuation_quotas table for quota management
- Creates evacuation_tracking table for activity tracking
- Sets up automatic tracking triggers
- Manages quotas by shipping line
- Sets default quotas for all shipping lines

**How to run**:
1. Open `supabase/07_evacuation_quota_tracking.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

⚠️ **DEPENDENCY**: Must run after `06_evacuation_integration.sql`.

#### Step 6: Evacuation Dashboard Enhancements
**File**: `13_evacuation_dashboard_enhancements.sql`

**What it does**:
- Creates enhanced statistics functions for dashboard
- Active officers tracking
- Shipping line statistics with quota tracking
- Officer performance summary view
- Real-time dashboard data functions

**How to run**:
1. Open `supabase/13_evacuation_dashboard_enhancements.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

⚠️ **DEPENDENCY**: Must run after `07_evacuation_quota_tracking.sql`.

#### Step 7: Evacuation Payment Status
**File**: `14_evacuation_payment_status.sql`

**What it does**:
- Adds payment_status column (paid/not_paid/pending)
- Adds payment_date column (timestamp)
- Adds payment_confirmed_by column (who confirmed payment)
- Adds payment_notes column (additional information)
- Creates indexes for payment status queries
- Updates RLS policies to allow officers to update payment status
- Creates function to get payment statistics

**How to run**:
1. Open `supabase/14_evacuation_payment_status.sql`
2. Copy entire content
3. Paste in SQL Editor
4. Click **Run**
5. Verify "Success" message

⚠️ **DEPENDENCY**: Must run after `06_evacuation_integration.sql`.

---

## Summary: Quick Reference

### For Basic System (WITHOUT Evacuation)

Run these scripts in order:

1. ✅ `01_schema.sql` - Core database
2. ✅ `12_verification_system.sql` - User verification
3. ⭐ `05_audit_log_enhancements.sql` - Enhanced audit logging (optional but recommended)

### For Complete System (WITH Evacuation)

Run these scripts in order:

1. ✅ `01_schema.sql` - Core database
2. ✅ `12_verification_system.sql` - User verification
3. ⭐ `05_audit_log_enhancements.sql` - Enhanced audit logging (optional but recommended)
4. ✅ `06_evacuation_integration.sql` - EVAC system
5. ✅ `07_evacuation_quota_tracking.sql` - EVAC quotas
6. ✅ `13_evacuation_dashboard_enhancements.sql` - EVAC dashboard enhancements
7. ✅ `14_evacuation_payment_status.sql` - EVAC payment status

---

## Troubleshooting Scripts (Only Run if Needed)

### Fix Scripts

Run these ONLY if you encounter specific errors:

#### `08_fix_rls_policies.sql`
**When to run**: If you get RLS (Row-Level Security) policy errors
**What it does**: Fixes RLS policies for profiles and other tables

#### `09_fix_evacuation_rls.sql`
**When to run**: If you get RLS errors specifically with evacuation data
**What it does**: Fixes RLS policies for evacuation tables

#### `10_diagnostic_check.sql`
**When to run**: If you're having general issues and want to diagnose the problem
**What it does**: Runs diagnostic checks on the database

#### `11_check_foreign_key.sql`
**When to run**: If you get foreign key constraint errors
**What it does**: Checks and fixes foreign key issues

#### `12_disable_rls_temp.sql`
**When to run**: ONLY in emergencies to temporarily disable RLS (use with caution!)
**What it does**: Temporarily disables RLS policies
⚠️ **WARNING**: This is a security risk - only use temporarily for debugging

---

## Scripts NOT to Run (For Reference Only)

These scripts are for documentation or special cases and should NOT be run:

- `02_seed_example.sql` - Example data (for reference only)
- `03_migration.sql` - Migration script (for existing data migrations)
- `04_audit_log_migration.sql` - Audit log migration (for existing data)
- `06_evacuation_integration_part2.sql` - Additional EVAC features (if needed)
- `setup_admin.sql` - Reference for admin setup (follow the main guide instead)

---

## After Running Scripts

### Create Super Admin Account

1. Go to **Authentication** → **Users**
2. Click **"Add User"**
3. Email: `phelixinvestment@gmail.com` (or your admin email)
4. Password: Choose a strong password
5. **Auto Confirm User**: ✅ Check this box
6. Click **"Create User"**
7. Copy the UUID from the users list
8. In SQL Editor, run:

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Mr Phelix', 'super_admin', null, 'approved');
```

Replace `<UUID>` with the actual UUID you copied.

### Create Staff Accounts

Repeat for each staff member:

1. Create user in Authentication → Users
2. Copy UUID
3. Run in SQL Editor:

```sql
-- Accountant
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Accountant Name', 'accountant', null, 'approved');

-- Operations Supervisor
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Supervisor Name', 'operations_supervisor', 'graftons', 'approved');

-- Fuel Attendant
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Attendant Name', 'fuel_attendant', 'graftons', 'approved');

-- Evacuation Officer (if using EVAC)
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Officer Name', 'evacuation_officer', null, 'approved');
```

---

## Verification Steps

After running all scripts:

### Step 1: Check Tables Exist

In SQL Editor, run:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see tables like:
- profiles
- accounting_entries
- payments_made
- workers
- worker_incidents
- worker_promotions
- fuel_logs
- audit_logs
- evacuation_records (if EVAC enabled)
- evacuation_notifications (if EVAC enabled)
- evacuation_quotas (if EVAC enabled)
- evacuation_tracking (if EVAC enabled)

### Step 2: Check RLS Policies

In SQL Editor, run:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see multiple RLS policies for each table.

### Step 3: Check Functions Exist

In SQL Editor, run:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

You should see functions like:
- auth_role
- is_super_admin
- log_user_action
- handle_new_user
- approve_user_account
- reject_user_account
- get_pending_verifications
- get_evacuation_statistics (if EVAC enabled)
- get_active_officers (if EVAC enabled)
- get_payment_statistics (if EVAC enabled)

---

## Common Errors and Solutions

### Error: "relation already exists"

**Solution**: This is normal - it means the table already exists. Continue to the next script.

### Error: "function already exists"

**Solution**: This is normal - it means the function already exists. Continue to the next script.

### Error: "enum value already exists"

**Solution**: This is normal - it means the enum value was already added. Continue to the next script.

### Error: "column already exists"

**Solution**: This is normal - it means the column was already added. Continue to the next script.

### Error: "policy already exists"

**Solution**: This is normal - it means the policy already exists. Continue to the next script.

### Error: "must be owner of table"

**Solution**: This usually means you don't have permission. Make sure you're using the correct Supabase project and have appropriate permissions.

### Error: "column ... does not exist"

**Solution**: Make sure you ran the scripts in the correct order. The column was probably added in a script you haven't run yet.

---

## Complete Execution Checklist

Use this checklist to track your progress:

### Core Setup
- [ ] Run `01_schema.sql`
- [ ] Run `12_verification_system.sql`
- [ ] Run `05_audit_log_enhancements.sql` (optional)
- [ ] Create super admin user
- [ ] Create super admin profile
- [ ] Create staff accounts

### Evacuation Setup (if applicable)
- [ ] Run `06_evacuation_integration.sql`
- [ ] Run `07_evacuation_quota_tracking.sql`
- [ ] Run `13_evacuation_dashboard_enhancements.sql`
- [ ] Run `14_evacuation_payment_status.sql`
- [ ] Create evacuation officer accounts
- [ ] Set evacuation quotas (optional)

### Verification
- [ ] All tables exist
- [ ] All RLS policies exist
- [ ] All functions exist
- [ ] Users can sign in
- [ ] Verification system works
- [ ] Evacuation system works (if enabled)

---

## What Each Script Does (Detailed)

### `01_schema.sql`
**Purpose**: Core database schema
**Tables Created**: profiles, accounting_entries, payments_made, workers, worker_incidents, worker_promotions, fuel_logs, audit_logs
**Functions Created**: auth_role, is_super_admin, handle_new_user, log_user_action
**Storage Buckets**: fuel-evidence
**RLS Policies**: All core tables have RLS enabled

### `05_audit_log_enhancements.sql`
**Purpose**: Enhanced audit logging
**Functions Modified**: log_user_action (enhanced with IP and user agent)
**Functions Added**: get_user_audit_logs, get_audit_logs_by_action, get_audit_logs_by_entity
**No Tables Created**: Enhances existing audit_logs table

### `12_verification_system.sql`
**Purpose**: User account approval workflow
**Columns Added**: verification_status, rejection_reason, verified_at, verified_by (to profiles)
**Functions Added**: approve_user_account, reject_user_account, get_pending_verifications
**Trigger Modified**: handle_new_user (sets pending status for new users)

### `06_evacuation_integration.sql`
**Purpose**: Evacuation tracking system
**Tables Created**: evacuation_records, evacuation_notifications
**Functions Created**: notify_super_admin_on_evacuation, log_evacuation_changes, container_exists
**Storage Buckets**: evacuation-docs
**Triggers Created**: Automatic notifications, audit logging, timestamp updates

### `07_evacuation_quota_tracking.sql`
**Purpose**: Evacuation quota management
**Tables Created**: evacuation_quotas, evacuation_tracking
**Functions Created**: track_evacuation_activity, update_evacuation_quotas_updated_at
**Triggers Created**: Automatic tracking, quota updates

### `13_evacuation_dashboard_enhancements.sql`
**Purpose**: Enhanced dashboard statistics
**Functions Created**: get_evacuation_statistics, get_active_officers, get_evacuation_by_shipping_line, get_recent_evacuations
**Views Created**: officer_performance_summary

### `14_evacuation_payment_status.sql`
**Purpose**: Payment status tracking
**Columns Added**: payment_status, payment_date, payment_confirmed_by, payment_notes (to evacuation_records)
**Functions Created**: get_payment_statistics
**Indexes Created**: idx_evacuation_payment_status, idx_evacuation_payment_date

---

## Quick Copy-Paste Execution Commands

### Basic System Setup
```sql
-- Run in order:
-- 1. supabase/01_schema.sql
-- 2. supabase/12_verification_system.sql
-- 3. supabase/05_audit_log_enhancements.sql (optional)
```

### Complete System Setup (with EVAC)
```sql
-- Run in order:
-- 1. supabase/01_schema.sql
-- 2. supabase/12_verification_system.sql
-- 3. supabase/05_audit_log_enhancements.sql (optional)
-- 4. supabase/06_evacuation_integration.sql
-- 5. supabase/07_evacuation_quota_tracking.sql
-- 6. supabase/13_evacuation_dashboard_enhancements.sql
-- 7. supabase/14_evacuation_payment_status.sql
```

---

## Next Steps After Running Scripts

1. **Configure React App**
   - Get Supabase credentials from Project Settings → API
   - Add to `.env` file:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Test the System**
   - Sign in as super admin
   - Test all dashboards
   - Test verification system
   - Test evacuation system (if enabled)

---

## Additional Notes

### Backward Compatibility
All scripts are designed to be backward compatible:
- Existing profiles are set to 'approved' verification status
- Existing evacuation records will have null payment status (shows as PENDING)
- Scripts use `IF NOT EXISTS` to avoid errors when objects already exist

### Rollback
If you need to rollback changes:
- Drop tables manually (use with caution)
- Run the scripts in reverse order (not recommended)
- Create a new Supabase project (recommended for fresh start)

### Performance
Scripts include:
- Indexes for commonly queried columns
- Efficient RLS policies
- Optimized functions

---

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify you ran scripts in the correct order
3. Run diagnostic script (`10_diagnostic_check.sql`)
4. Check the main README.md for project-specific information
5. Review individual SQL scripts for comments

---

## Summary

**Minimum Required Scripts** (for basic system):
1. `01_schema.sql`
2. `12_verification_system.sql`

**Recommended Scripts** (for basic system):
1. `01_schema.sql`
2. `12_verification_system.sql`
3. `05_audit_log_enhancements.sql`

**Complete System Scripts** (with EVAC):
1. `01_schema.sql`
2. `12_verification_system.sql`
3. `05_audit_log_enhancements.sql`
4. `06_evacuation_integration.sql`
5. `07_evacuation_quota_tracking.sql`
6. `13_evacuation_dashboard_enhancements.sql`
7. `14_evacuation_payment_status.sql`

Run scripts in the exact order shown above for best results!
