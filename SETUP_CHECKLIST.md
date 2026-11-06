# Supabase Setup Checklist

Use this checklist to track your progress through the setup process.

## Phase 1: Project Setup

- [ ] Create Supabase account
- [ ] Create new Supabase project
- [ ] Save database password securely
- [ ] Wait for project provisioning (1-2 minutes)

## Phase 2: Configuration

- [ ] Go to Authentication → Providers → Email
- [ ] Disable email confirmation (uncheck "Confirm email")
- [ ] Click Save

## Phase 3: Core Database Setup

- [ ] Open SQL Editor
- [ ] Run `01_schema.sql`
- [ ] Verify "Success" message
- [ ] Run `05_audit_log_enhancements.sql` (optional but recommended)
- [ ] Verify "Success" message

## Phase 4: Super Admin Setup

- [ ] Go to Authentication → Users
- [ ] Add Super Admin user
- [ ] Enter email and password
- [ ] Check "Auto Confirm User"
- [ ] Click "Create User"
- [ ] Copy the UUID
- [ ] Go to SQL Editor
- [ ] Run INSERT statement for super admin profile
- [ ] Replace `<UUID>` with actual UUID
- [ ] Verify profile created

## Phase 5: Verification System

- [ ] Open SQL Editor
- [ ] Run `12_verification_system.sql`
- [ ] Verify "Success" message
- [ ] Confirm existing profiles set to 'approved'

## Phase 6: Staff Account Creation

### Accountant
- [ ] Create accountant user in Authentication
- [ ] Copy UUID
- [ ] Create accountant profile in SQL Editor
- [ ] Set role to 'accountant'
- [ ] Set depot to null

### Operations Supervisor
- [ ] Create operations supervisor user in Authentication
- [ ] Copy UUID
- [ ] Create supervisor profile in SQL Editor
- [ ] Set role to 'operations_supervisor'
- [ ] Set depot to 'graftons' or 'hastings'

### Fuel Attendant
- [ ] Create fuel attendant user in Authentication
- [ ] Copy UUID
- [ ] Create attendant profile in SQL Editor
- [ ] Set role to 'fuel_attendant'
- [ ] Set depot to 'graftons' or 'hastings'

### Evacuation Officer (if using EVAC)
- [ ] Create evacuation officer user in Authentication
- [ ] Copy UUID
- [ ] Create officer profile in SQL Editor
- [ ] Set role to 'evacuation_officer'
- [ ] Set depot to null

## Phase 7: Evacuation System (Optional - Skip if not using EVAC)

- [ ] Run `06_evacuation_integration.sql`
- [ ] Verify "Success" message
- [ ] Run `07_evacuation_quota_tracking.sql`
- [ ] Verify "Success" message
- [ ] Run `13_evacuation_dashboard_enhancements.sql`
- [ ] Verify "Success" message
- [ ] Run `14_evacuation_payment_status.sql`
- [ ] Verify "Success" message
- [ ] Set evacuation quotas for each shipping line (optional)

## Phase 8: React App Configuration

- [ ] Go to Project Settings → API
- [ ] Copy Project URL
- [ ] Copy anon public API key
- [ ] Create or edit `.env` file
- [ ] Add VITE_SUPABASE_URL
- [ ] Add VITE_SUPABASE_ANON_KEY
- [ ] Save `.env` file

## Phase 9: Dependencies

- [ ] Open terminal in project directory
- [ ] Run `npm install`
- [ ] Wait for installation to complete

## Phase 10: Testing

### Start Server
- [ ] Run `npm run dev`
- [ ] Verify server starts at http://localhost:5173

### Test Super Admin
- [ ] Open browser to localhost:5173
- [ ] Sign in as super admin
- [ ] Verify redirect to Super Admin Dashboard
- [ ] Check overview statistics display
- [ ] Verify Accounting link works
- [ ] Verify Operations link works
- [ ] Verify Fuel Monitoring link works
- [ ] Verify Audit Log link works
- [ ] Verify Verifications link works
- [ ] Verify Evacuation Dashboard link (if enabled)

### Test Verification System
- [ ] Sign out as super admin
- [ ] Create new user account
- [ ] Note pending approval message
- [ ] Sign in as super admin
- [ ] Go to Verifications page
- [ ] Verify pending account appears
- [ ] Click Approve
- [ ] Sign out
- [ ] Sign in as new user
- [ ] Verify login works

### Test Accounting
- [ ] Sign in as accountant
- [ ] Navigate to Accounting Dashboard
- [ ] Create revenue entry
- [ ] Create expense entry
- [ ] Create payment made
- [ ] Verify entries appear in lists

### Test Operations
- [ ] Sign in as operations supervisor
- [ ] Navigate to Operations Dashboard
- [ ] Add a worker
- [ ] Log an incident
- [ ] Record a promotion
- [ ] Verify operations appear in lists

### Test Fuel Monitoring
- [ ] Sign in as fuel attendant
- [ ] Navigate to Fuel Dashboard
- [ ] Create fuel log with photos
- [ ] Verify log appears in list

### Test Evacuation (if enabled)
- [ ] Sign in as evacuation officer
- [ ] Navigate to Evacuation Panel
- [ ] Create evacuation record
- [ ] Sign in as super admin
- [ ] Navigate to Evacuation Dashboard
- [ ] Verify statistics update
- [ ] Verify active officers list
- [ ] Verify shipping line statistics

### Test Audit Log
- [ ] Sign in as super admin
- [ ] Navigate to Audit Log
- [ ] Verify activities are logged
- [ ] Check details are correct

## Phase 11: Final Verification

- [ ] All users can sign in
- [ ] All dashboards accessible
- [ ] Verification system working
- [ ] Audit log recording activities
- [ ] No console errors in browser
- [ ] All RLS policies working

## Phase 12: Cleanup (Optional)

- [ ] Remove any test data
- [ ] Review audit logs
- [ ] Adjust quotas if needed
- [ ] Update documentation
- [ ] Commit `.env.example` (not `.env`)

---

## Notes

- If any SQL script fails with "already exists", that's usually fine - continue
- If you encounter RLS errors, run `08_fix_rls_policies.sql`
- If you encounter foreign key errors, run `11_check_foreign_key.sql`
- For diagnostics, run `10_diagnostic_check.sql`
- Save this checklist after completion for future reference

---

## SQL Scripts Execution Order

### Without EVAC
1. `01_schema.sql`
2. `05_audit_log_enhancements.sql` (optional)
3. `12_verification_system.sql`

### With EVAC
1. `01_schema.sql`
2. `05_audit_log_enhancements.sql` (optional)
3. `12_verification_system.sql`
4. `06_evacuation_integration.sql`
5. `07_evacuation_quota_tracking.sql`
6. `13_evacuation_dashboard_enhancements.sql`

---

## Quick User Creation Template

```sql
-- Replace <UUID> with actual UUID from Auth
-- Replace values as needed

insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Full Name', 'role', 'depot', 'approved');
```

**Roles**: `super_admin`, `accountant`, `operations_supervisor`, `fuel_attendant`, `evacuation_officer`
**Depots**: `graftons`, `hastings`, or `null`
