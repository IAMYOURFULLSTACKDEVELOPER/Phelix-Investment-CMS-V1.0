# Quick Migration Checklist

## Run these SQL files in Supabase SQL Editor in this exact order:

### Phase 1: Base Setup
- [ ] **01_schema.sql** - Base schema and tables
- [ ] **03_migration.sql** - Additional migrations
- [ ] **04_audit_log_migration.sql** - Audit log setup
- [ ] **05_audit_log_enhancements.sql** - Audit log enhancements

### Phase 2: Evacuation System
- [ ] **06_evacuation_integration.sql** - Evacuation enum update (Part 1)
- [ ] **06_evacuation_integration_part2.sql** - Evacuation tables and policies (Part 2)
- [ ] **07_evacuation_quota_tracking.sql** - Quota and tracking system (NEW)

### Phase 3: Admin Setup (Optional)
- [ ] **setup_admin.sql** - Create admin user

---

## How to Run Each File:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" → "New query"
4. Open the SQL file from your project
5. Copy entire content
6. Paste into Supabase SQL Editor
7. Click "Run"
8. Wait for success message
9. Repeat for next file

---

## Expected Tables After Migration:

✅ profiles
✅ accounting_entries
✅ payments_made
✅ workers
✅ worker_incidents
✅ worker_promotions
✅ fuel_logs
✅ evacuation_records
✅ evacuation_notifications
✅ evacuation_quotas
✅ evacuation_tracking
✅ audit_logs

---

## After Running All Migrations:

1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Test account creation
4. Test sign in
5. Verify all features work

---

## Need Help?

See `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions.
