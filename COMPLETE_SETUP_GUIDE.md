# Complete Supabase Setup Guide - Phelix Investment CMS

This guide provides a step-by-step process to set up your entire Supabase system with all functionality including:
- Super Admin Dashboard with full visibility
- Accounting Sector (revenue, expenses, payments)
- Operations Sector (workers, incidents, promotions)
- Fuel Monitoring Sector (fuel logs with evidence)
- Evacuation Sector (if using EVAC system)
- User Verification System
- Audit Logging
- Enhanced Dashboard Statistics

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Supabase Project](#create-supabase-project)
3. [Configure Email Settings](#configure-email-settings)
4. [Run Core Database Scripts](#run-core-database-scripts)
5. [Create Super Admin Account](#create-super-admin-account)
6. [Run Verification System](#run-verification-system)
7. [Create Staff Accounts](#create-staff-accounts)
8. [Run Evacuation System (Optional)](#run-evacuation-system-optional)
9. [Configure React App](#configure-react-app)
10. [Test the System](#test-the-system)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- ✅ A Supabase account (free tier is sufficient)
- ✅ Access to the Supabase Dashboard
- ✅ Basic understanding of SQL (for running scripts)
- ✅ The Phelix Investment CMS project files on your computer

---

## Create Supabase Project

### Step 1: Create New Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Click **"New Project"** button
4. Fill in project details:
   - **Name**: `phelix-cms` (or your preferred name)
   - **Database Password**: Choose a strong password and save it securely
   - **Region**: Choose the region closest to your users
5. Click **"Create new project"**
6. Wait for project provisioning (1-2 minutes)

> **Important**: Save your database password securely - you'll need it for direct database access if needed.

---

## Configure Email Settings

### Step 2: Disable Email Confirmation

Since we're using manual admin approval instead of email verification:

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Click on **Email**
3. Scroll down to **Confirm email** section
4. **Uncheck** "Confirm email" (disable email confirmation)
5. Click **Save**

> **Why?** The verification system uses manual admin approval. Users need admin approval before they can sign in.

---

## Run Core Database Scripts

### Step 3: Run Core Schema

This creates all the main tables, roles, and security policies.

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file: `supabase/01_schema.sql`
4. Copy the entire content of the file
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter`)
7. Wait for completion - you should see "Success" in the results

**What this script creates:**
- Roles enum (super_admin, accountant, operations_supervisor, fuel_attendant, evacuation_officer)
- Profiles table
- Accounting tables (accounting_entries, payments_made)
- Operations tables (workers, worker_incidents, worker_promotions)
- Fuel monitoring table (fuel_logs)
- Audit log table (audit_logs)
- Storage bucket for fuel evidence
- All Row-Level Security (RLS) policies
- Helper functions (auth_role, is_super_admin, log_user_action)

### Step 4: Run Audit Log Enhancements (Optional but Recommended)

This adds enhanced audit logging capabilities.

1. In SQL Editor, create a new query
2. Open: `supabase/05_audit_log_enhancements.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **"Run"**

**What this script adds:**
- Enhanced audit log functions
- IP address and user agent tracking
- Better error handling
- Functions to query audit logs by action or entity

---

## Create Super Admin Account

### Step 5: Create Super Admin User

Create the initial super admin who will manage the entire system.

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **"Add User"** (top right)
3. Fill in the details:
   - **Email**: `phelixinvestment@gmail.com` (or your admin email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: **Yes** (check this box)
4. Click **"Create User"**
5. The user will appear in the users list
6. **Copy the UUID** (it looks like: `550e8400-e29b-41d4-a716-446655440000`)

### Step 6: Create Super Admin Profile

Now create the profile entry for the super admin.

1. Go back to **SQL Editor**
2. Create a new query
3. Run this SQL (replace `<UUID_HERE>` with the actual UUID you copied):

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID_HERE>', 'Mr Phelix', 'super_admin', null, 'approved');
```

**Example:**
```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('550e8400-e29b-41d4-a716-446655440000', 'Mr Phelix', 'super_admin', null, 'approved');
```

---

## Run Verification System

### Step 7: Run Verification System Script

This adds the manual account approval workflow.

1. In SQL Editor, create a new query
2. Open: `supabase/12_verification_system.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **"Run"**

**What this script adds:**
- `verification_status` column to profiles (pending/approved/rejected)
- `rejection_reason`, `verified_at`, `verified_by` columns
- Updates user creation trigger to set pending status
- Functions to approve/reject accounts
- Function to fetch pending verifications
- Sets existing profiles to 'approved' for backward compatibility

---

## Create Staff Accounts

### Step 8: Create Staff User Accounts

Create accounts for each sector's staff members.

#### For Accountant:

1. Go to **Authentication** → **Users** → **Add User**
2. Email, Password, Auto Confirm: Yes
3. Click **"Create User"**
4. Copy the UUID
5. In SQL Editor:

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Accountant Name', 'accountant', null, 'approved');
```

#### For Operations Supervisor:

1. Create user in Authentication → Users
2. Copy UUID
3. In SQL Editor:

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Supervisor Name', 'operations_supervisor', 'graftons', 'approved');
```

**Depot options**: `graftons`, `hastings`, or `null` (for accountant/super_admin)

#### For Fuel Attendant:

1. Create user in Authentication → Users
2. Copy UUID
3. In SQL Editor:

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Attendant Name', 'fuel_attendant', 'graftons', 'approved');
```

#### For Evacuation Officer (if using EVAC):

1. Create user in Authentication → Users
2. Copy UUID
3. In SQL Editor:

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Officer Name', 'evacuation_officer', null, 'approved');
```

---

## Run Evacuation System (Optional)

### Step 9: Run Evacuation Integration

**Only run this if you're using the EVAC (Evacuation) system.**

1. In SQL Editor, create a new query
2. Open: `supabase/06_evacuation_integration.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **"Run"**

**What this script adds:**
- `evacuation_records` table
- `evacuation_notifications` table
- RLS policies for evacuation data
- Triggers for automatic notifications
- Audit logging for evacuation activities
- Storage bucket for evacuation documents
- Views for evacuation statistics

### Step 10: Run Evacuation Quota Tracking

**Only run this if you're using the EVAC system.**

1. In SQL Editor, create a new query
2. Open: `supabase/07_evacuation_quota_tracking.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **"Run"**

**What this script adds:**
- `evacuation_quotas` table for quota management
- `evacuation_tracking` table for activity tracking
- Triggers to automatically track evacuations
- RLS policies for quota management
- Default quotas for all shipping lines

### Step 11: Run Evacuation Dashboard Enhancements

**Only run this if you're using the EVAC system.**

1. In SQL Editor, create a new query
2. Open: `supabase/13_evacuation_dashboard_enhancements.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **"Run"**

**What this script adds:**
- Enhanced statistics functions for dashboard
- Active officers tracking
- Shipping line statistics with quota tracking
- Officer performance summary view
- Real-time dashboard data

### Step 12: Set Evacuation Quotas (Optional)

Set quotas for each shipping line:

```sql
-- Set quota for Grimaldi
update evacuation_quotas
set total_evacuations = 100
where shipping_line = 'Grimaldi';

-- Set quota for CMA CGM
update evacuation_quotas
set total_evacuations = 80
where shipping_line = 'CMA CGM';

-- Set quota for MAERSK LINE
update evacuation_quotas
set total_evacuations = 120
where shipping_line = 'MAERSK LINE';

-- Set quota for MSC
update evacuation_quotas
set total_evacuations = 90
where shipping_line = 'MSC';

-- Set quota for HAPAG LLYOD
update evacuation_quotas
set total_evacuations = 70
where shipping_line = 'HAPAG LLYOD';
```

### Step 13: Run Payment Status System (Optional - for EVAC)

**Only run this if you're using the EVAC system and want payment tracking.**

1. In SQL Editor, create a new query
2. Open: `supabase/14_evacuation_payment_status.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **"Run"**

**What this script adds:**
- `payment_status` column to evacuation_records (paid/not_paid/pending)
- `payment_date` column (timestamp when payment was marked)
- `payment_confirmed_by` column (who confirmed payment)
- `payment_notes` column (additional payment information)
- Indexes for payment status queries
- RLS policy updates to allow officers to update payment status
- Function to get payment statistics

---

## Configure React App

### Step 13: Get Supabase Credentials

1. In Supabase Dashboard, go to **Project Settings** (gear icon, bottom left)
2. Click on **API** (left sidebar)
3. Copy these values:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **anon public** API key (the long key)

### Step 14: Configure Environment Variables

1. In your project folder, create or edit the `.env` file
2. Add the Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with the actual values you copied.

### Step 15: Install Dependencies

If you haven't already:

```bash
cd phelix-cms
npm install
```

---

## Test the System

### Step 16: Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:5173`

### Step 17: Test Super Admin Login

1. Open browser to `http://localhost:5173`
2. You should see the login page
3. Sign in with your super admin credentials
4. You should be redirected to the Super Admin Dashboard

### Step 18: Test Super Admin Dashboard Features

Verify you can see:
- ✅ Overview statistics (revenue, expenses, active workers, fuel dispensed)
- ✅ Accounting card link
- ✅ Operations card link
- ✅ Fuel Monitoring card link
- ✅ Audit Log card link
- ✅ Verifications card link
- ✅ Evacuation Dashboard link (if EVAC is enabled)

### Step 19: Test Verification System

1. Sign out as super admin
2. Go to signup page
3. Create a new user account
4. Note the message about pending approval
5. Sign in as super admin
6. Go to **Verifications** page
7. You should see the pending account
8. Click **Approve**
9. Sign out and try to sign in as the new user - it should work

### Step 20: Test Accounting Sector

1. Sign in as the accountant
2. Navigate to Accounting Dashboard
3. Try creating:
   - Revenue entry
   - Expense entry
   - Payment made
4. Verify entries appear in the list

### Step 21: Test Operations Sector

1. Sign in as operations supervisor
2. Navigate to Operations Dashboard
3. Try:
   - Adding a worker
   - Logging an incident
   - Recording a promotion
4. Verify operations appear in the lists

### Step 22: Test Fuel Monitoring Sector

1. Sign in as fuel attendant
2. Navigate to Fuel Dashboard
3. Try creating a fuel log with photo uploads
4. Verify the log appears in the list

### Step 23: Test Evacuation System (if enabled)

1. Sign in as evacuation officer
2. Navigate to Evacuation Panel
3. Create an evacuation record
4. Sign in as super admin
5. Navigate to Evacuation Dashboard
6. Verify:
   - Statistics update
   - Active officers list shows the officer
   - Shipping line statistics update
   - Recent evacuations appear

### Step 24: Test Audit Log

1. Sign in as super admin
2. Navigate to Audit Log
3. Verify you can see all system activities
4. Check that actions are logged with proper details

---

## SQL Scripts Summary

### Required Scripts (Run in Order)

For a complete system without EVAC:

1. ✅ `01_schema.sql` - Core database schema
2. ✅ `05_audit_log_enhancements.sql` - Enhanced audit logging (optional but recommended)
3. ✅ `12_verification_system.sql` - User verification system

For a complete system WITH EVAC:

1. ✅ `01_schema.sql` - Core database schema
2. ✅ `05_audit_log_enhancements.sql` - Enhanced audit logging (optional but recommended)
3. ✅ `12_verification_system.sql` - User verification system
4. ✅ `06_evacuation_integration.sql` - EVAC system integration
5. ✅ `07_evacuation_quota_tracking.sql` - EVAC quota tracking
6. ✅ `13_evacuation_dashboard_enhancements.sql` - Enhanced EVAC dashboard

### Fix Scripts (Only Run if You Encounter Issues)

- `08_fix_rls_policies.sql` - Fix RLS policies
- `09_fix_evacuation_rls.sql` - Fix EVAC RLS
- `10_diagnostic_check.sql` - Run diagnostics
- `11_check_foreign_key.sql` - Check foreign keys

### Other Scripts (Not Required for Setup)

- `02_seed_example.sql` - Example data (optional)
- `03_migration.sql` - Migration script (for existing data)
- `04_audit_log_migration.sql` - Audit log migration (for existing data)
- `06_evacuation_integration_part2.sql` - Additional EVAC features (if needed)
- `12_disable_rls_temp.sql` - Temporarily disable RLS (use with caution)
- `setup_admin.sql` - Reference for admin setup (follow steps above instead)

---

## What Each Script Does

### `01_schema.sql`
- Creates all core tables (profiles, accounting, operations, fuel)
- Sets up roles and enums
- Implements Row-Level Security (RLS)
- Creates helper functions
- Sets up storage buckets

### `05_audit_log_enhancements.sql`
- Adds enhanced audit logging
- IP address and user agent tracking
- Functions to query audit logs
- Better error handling

### `12_verification_system.sql`
- Adds verification workflow
- Functions to approve/reject accounts
- Pending user management
- Backward compatible with existing profiles

### `06_evacuation_integration.sql`
- Creates evacuation_records table
- Creates evacuation_notifications table
- Sets up triggers for notifications
- Implements audit logging for evacuations
- Creates storage bucket for documents

### `07_evacuation_quota_tracking.sql`
- Creates evacuation_quotas table
- Creates evacuation_tracking table
- Sets up automatic tracking triggers
- Manages quotas by shipping line

### `13_evacuation_dashboard_enhancements.sql`
- Creates statistics functions
- Active officers tracking
- Shipping line statistics
- Performance summary views

---

## Troubleshooting

### Issue: "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"

**Solution**: Make sure you created the `.env` file with the correct credentials from Project Settings → API.

### Issue: "User not found" when signing in

**Solution**: Make sure you created both the Auth user AND the profile entry in the profiles table.

### Issue: "Your account is pending approval"

**Solution**: This is expected behavior - sign in as super admin and approve the account in the Verifications page.

### Issue: SQL script fails with "already exists" error

**Solution**: This is usually fine - it means the object already exists. Continue with the next script.

### Issue: Can't see the Storage bucket

**Solution**: Go to Storage in the dashboard, you should see the `fuel-evidence` bucket created by the schema script.

### Issue: Evacuation dashboard shows no data

**Solution**: Make sure:
1. Evacuation officers have been created
2. Officers have created evacuation records
3. All EVAC scripts were run in order
4. The functions exist (run `13_evacuation_dashboard_enhancements.sql`)

### Issue: "function does not exist" error

**Solution**: Run the corresponding script that creates the function (e.g., for `get_evacuation_statistics`, run `13_evacuation_dashboard_enhancements.sql`).

### Issue: RLS policy errors

**Solution**: Run `08_fix_rls_policies.sql` to fix RLS policies.

### Issue: Foreign key constraint errors

**Solution**: Run `11_check_foreign_key.sql` to check and fix foreign key issues.

---

## Quick Reference: Creating New Users

For each new staff member:

1. **Create Auth User**:
   - Authentication → Users → Add User
   - Email, Password, Auto Confirm: Yes
   - Copy UUID

2. **Create Profile**:
   ```sql
   insert into profiles (id, full_name, role, depot, verification_status)
   values
     ('<UUID>', 'Full Name', 'role', 'depot', 'approved');
   ```

3. **Roles**: `super_admin`, `accountant`, `operations_supervisor`, `fuel_attendant`, `evacuation_officer`

4. **Depots**: `graftons`, `hastings`, or `null` (for accountant/super_admin/evacuation_officer)

---

## Security Notes

- ✅ Never commit `.env` file to version control
- ✅ Use strong passwords for all users
- ✅ Keep your Supabase service role key secret (never use it in client-side code)
- ✅ Only the anon key should be used in the React app
- ✅ The system uses Row-Level Security (RLS) - don't disable it unless necessary
- ✅ Regularly review audit logs for suspicious activity
- ✅ Monitor the Verifications page for pending account requests

---

## Dashboard Features Summary

### Super Admin Dashboard
- ✅ Overview with statistics across all sectors
- ✅ Links to all sector dashboards
- ✅ Audit Log for system monitoring
- ✅ Verifications for account approval
- ✅ Evacuation Dashboard (if enabled)

### Accounting Dashboard
- ✅ Revenue and expense tracking
- ✅ Monthly/yearly reports
- ✅ Payments made log
- ✅ Category-based analysis

### Operations Dashboard
- ✅ Worker directory by depot
- ✅ Worker status management
- ✅ Incident logging
- ✅ Promotion tracking
- ✅ Star rating system

### Fuel Monitoring Dashboard
- ✅ Fuel issuance logs
- ✅ Photo evidence upload
- ✅ Receipt tracking
- ✅ Depot-based tracking

### Evacuation Dashboard (if enabled)
- ✅ Total, today, weekly, monthly statistics
- ✅ Active officers tracking
- ✅ Shipping line statistics
- ✅ Quota management
- ✅ Real-time notifications

---

## Next Steps After Setup

1. ✅ Test all user roles can sign in and access their dashboards
2. ✅ Create sample data for testing each sector
3. ✅ Test the verification workflow
4. ✅ Configure email notifications (optional, requires Supabase Edge Functions)
5. ✅ Set up evacuation quotas (if using EVAC)
6. ✅ Review and customize audit logging preferences
7. ✅ Deploy to production (Vercel, Netlify, etc.)

---

## Need Help?

- Check the main README.md for project-specific information
- Review individual SQL scripts for comments explaining each section
- Check Supabase documentation: https://supabase.com/docs
- Run diagnostic script (`10_diagnostic_check.sql`) if you encounter issues

---

## System Architecture Overview

```
Phelix Investment CMS
├── Super Admin (full visibility)
│   ├── Super Admin Dashboard
│   ├── Audit Log
│   ├── Verifications
│   └── Evacuation Dashboard (if enabled)
├── Accounting Sector
│   ├── Accounting Dashboard
│   └── Payments Made
├── Operations Sector
│   ├── Operations Dashboard
│   └── Incident Log
├── Fuel Monitoring Sector
│   └── Fuel Dashboard
└── Evacuation Sector (if enabled)
    ├── Evacuation Panel
    ├── Evacuations Done
    └── Evacuation Dashboard (super admin view)
```

All sectors are protected by Row-Level Security (RLS) in Supabase, ensuring users can only access data appropriate to their role.
