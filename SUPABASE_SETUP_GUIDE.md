# Supabase Setup Guide - Step by Step

This guide will walk you through setting up a new Supabase project for the Phelix Investment CMS from scratch.

## Prerequisites
- A Supabase account (free tier is sufficient)
- Basic understanding of the Supabase Dashboard

---

## Step 1: Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `phelix-cms` (or your preferred name)
   - **Database Password**: Choose a strong password (save it somewhere safe!)
   - **Region**: Choose the region closest to your users
5. Click **"Create new project"**
6. Wait for the project to be provisioned (this takes 1-2 minutes)

---

## Step 2: Configure Email Confirmation Settings

Before running the SQL scripts, you need to disable email confirmation since we're using manual approval:

1. In your Supabase Dashboard, go to **Authentication** → **Providers**
2. Click on **Email**
3. Scroll down to **Confirm email** section
4. **Uncheck** "Confirm email" (disable email confirmation)
5. Click **Save**

> **Why?** The verification system uses manual admin approval instead of email verification.

---

## Step 3: Run the Core Schema Script

This creates all the main tables, roles, and RLS policies.

1. In the Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase/01_schema.sql` from your project
4. Copy the entire content of the file
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter`)
7. Wait for it to complete (you should see "Success" in the results)

This script creates:
- Roles enum (super_admin, accountant, operations_supervisor, fuel_attendant, evacuation_officer)
- Profiles table
- Accounting tables (accounting_entries, payments_made)
- Operations tables (workers, worker_incidents, worker_promotions)
- Fuel monitoring table (fuel_logs)
- Audit log table
- Storage bucket for fuel evidence
- All RLS policies
- Helper functions

---

## Step 4: Create the Super Admin Account

You need to create the initial super admin user manually:

1. In the Supabase Dashboard, go to **Authentication** → **Users**
2. Click **"Add User"** (top right)
3. Fill in the details:
   - **Email**: `phelixinvestment@gmail.com` (or your admin email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: **Yes** (check this box)
4. Click **"Create User"**
5. The user will appear in the users list - **copy the UUID** (it looks like: `550e8400-e29b-41d4-a716-446655440000`)

Now create the profile entry:

1. Go back to **SQL Editor**
2. Create a new query
3. Run this SQL (replace `<UUID_HERE>` with the actual UUID you copied):

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID_HERE>', 'Mr Phelix', 'super_admin', null, 'approved');
```

Example:
```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('550e8400-e29b-41d4-a716-446655440000', 'Mr Phelix', 'super_admin', null, 'approved');
```

---

## Step 5: Run the Verification System Script

This adds the manual account approval workflow.

1. In the SQL Editor, create a new query
2. Open the file `supabase/12_verification_system.sql`
3. Copy the entire content
4. Paste it into the SQL Editor
5. Click **"Run"**

This script adds:
- `verification_status` column to profiles
- `rejection_reason`, `verified_at`, `verified_by` columns
- Updates the user creation trigger to set pending status
- Functions to approve/reject accounts
- Function to fetch pending verifications

---

## Step 6: Create Additional Staff Users (Optional)

If you want to create other staff accounts (accountant, operations supervisor, etc.):

1. Go to **Authentication** → **Users**
2. Click **"Add User"**
3. Fill in email and password
4. **Auto Confirm User**: Yes
5. Click **"Create User"**
6. Copy the UUID
7. In SQL Editor, create a profile entry:

For an accountant:
```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID_HERE>', 'Accountant Name', 'accountant', null, 'approved');
```

For an operations supervisor:
```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID_HERE>', 'Supervisor Name', 'operations_supervisor', 'graftons', 'approved');
```

For a fuel attendant:
```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID_HERE>', 'Attendant Name', 'fuel_attendant', 'graftons', 'approved');
```

---

## Step 7: Get Supabase Credentials

You need the API credentials to connect your React app:

1. In the Supabase Dashboard, go to **Project Settings** (gear icon, bottom left)
2. Click on **API** (left sidebar)
3. Copy the following values:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **anon public** API key (the long key)

---

## Step 8: Configure Your React App

1. In your project folder, create a `.env` file (or edit the existing one)
2. Add the Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with the actual values you copied in Step 7.

---

## Step 9: Test the Setup

1. Make sure you're in the project directory
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`
5. Try to sign in with your super admin account

---

## Step 10: Test the Verification Workflow

1. Create a new user account through the signup page
2. Sign out and sign in as the super admin
3. Go to the **Verifications** page (linked from the Super Admin Dashboard)
4. You should see the pending account
5. Click **Approve** to approve the account
6. Sign out and try to sign in as the new user - it should work now

---

## Setting Up the Evacuation System (Optional)

If you want to use the EVAC (Evacuation) system:

### Step 1: Run EVAC Integration Scripts

After completing the basic setup, run these scripts in order:

1. **Run EVAC Integration**:
   - In SQL Editor, open `supabase/06_evacuation_integration.sql`
   - Copy and run the entire script
   - This creates evacuation_records, notifications, and related tables

2. **Run EVAC Quota Tracking**:
   - In SQL Editor, open `supabase/07_evacuation_quota_tracking.sql`
   - Copy and run the entire script
   - This adds quota management and tracking

3. **Run EVAC Dashboard Enhancements**:
   - In SQL Editor, open `supabase/13_evacuation_dashboard_enhancements.sql`
   - Copy and run the entire script
   - This adds enhanced statistics for the Super Admin dashboard

### Step 2: Create Evacuation Officer Accounts

Create evacuation officer users the same way you created the super admin:

1. Go to **Authentication** → **Users** → **Add User**
2. Email, Password, Auto Confirm: Yes
3. Copy the UUID
4. Create profile entry:

```sql
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Officer Name', 'evacuation_officer', null, 'approved');
```

### Step 3: Set Up Evacuation Quotas (Optional)

The quota system tracks evacuations by shipping line. You can set quotas for each shipping line:

```sql
-- Update quota for a specific shipping line
update evacuation_quotas
set total_evacuations = 100
where shipping_line = 'Grimaldi';
```

### Step 4: Access the Dashboard

- Sign in as the super admin
- Navigate to `/evacuation/dashboard` (accessible from the Super Admin Dashboard)
- View comprehensive statistics including:
  - Total evacuations
  - Today's evacuations
  - This week's evacuations
  - Active officers (who performed evacuations today)
  - Shipping line statistics
  - Recent evacuation records

---

For a fresh project, run these in order:

1. ✅ `01_schema.sql` - Core schema (tables, RLS, functions)
2. ✅ Create super admin user manually (Authentication → Users)
3. ✅ Create profile entry for super admin (SQL Editor)
4. ✅ `12_verification_system.sql` - Verification workflow
5. ✅ `06_evacuation_integration.sql` - EVAC system integration (if using EVAC)
6. ✅ `07_evacuation_quota_tracking.sql` - EVAC quota tracking (if using EVAC)
7. ✅ `13_evacuation_dashboard_enhancements.sql` - Enhanced EVAC dashboard statistics (if using EVAC)

**Additional scripts** (only if needed for specific features):
- `02_seed_example.sql` - Example data (optional)
- `05_audit_log_enhancements.sql` - Enhanced audit logging (optional)

**Fix scripts** (only run if you encounter issues):
- `08_fix_rls_policies.sql` - Fix RLS policies
- `09_fix_evacuation_rls.sql` - Fix EVAC RLS
- `10_diagnostic_check.sql` - Diagnostics
- `11_check_foreign_key.sql` - Check foreign keys

---

## Troubleshooting

### Issue: "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
**Solution**: Make sure you created the `.env` file with the correct credentials from Step 7.

### Issue: "User not found" when signing in
**Solution**: Make sure you created both the Auth user AND the profile entry in the profiles table.

### Issue: "Your account is pending approval"
**Solution**: This is expected behavior - sign in as super admin and approve the account in the Verifications page.

### Issue: SQL script fails with "already exists" error
**Solution**: This is usually fine - it means the object already exists. Continue with the next script.

### Issue: Can't see the Storage bucket
**Solution**: Go to Storage in the dashboard, you should see the `fuel-evidence` bucket created by the schema script.

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

4. **Depots**: `graftons`, `hastings`, or `null` (for accountant/super_admin)

---

## Security Notes

- Never commit `.env` file to version control
- Use strong passwords for all users
- Keep your Supabase service role key secret (never use it in client-side code)
- Only the anon key should be used in the React app
- The system uses Row-Level Security (RLS) - don't disable it unless necessary

---

## Next Steps

After setup:
1. Test all user roles can sign in and access their respective dashboards
2. Create sample data for testing
3. Test the verification workflow
4. Configure email notifications (optional, requires Supabase Edge Functions)
5. Deploy to production (Vercel, Netlify, etc.)

---

## Need Help?

- Check the main README.md for project-specific information
- Review the SQL scripts for comments explaining each section
- Check Supabase documentation: https://supabase.com/docs
