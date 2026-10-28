# 🚨 URGENT FIX GUIDE - Both Issues

## Issue 1: RLS Policy Error When Creating Evacuation

**Error Message:**
```
new row violates row-level security policy for table 'evacuation_tracking'
```

### Fix for Issue 1:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" → "New query"
4. Open the file: `supabase/08_fix_rls_policies.sql`
5. Copy the entire content
6. Paste into SQL Editor
7. Click "Run"
8. Wait for success message

---

## Issue 2: Super Admin Panel Not Displaying

**Possible Causes:**
1. Your super admin email is not exactly `phelixinvestment@gmail.com`
2. The email field is not being loaded properly in the profile
3. You're not actually logged in as a super admin

### Fix for Issue 2:

#### Option A: Check Your Email (Recommended)

1. Sign in to your application
2. Open browser console (F12)
3. Look for a log message showing your email
4. If it's not `phelixinvestment@gmail.com`, you need to update it

#### Option B: Temporarily Disable Email Restriction (For Testing)

If you want to test without the email restriction:

1. Open `src/App.tsx`
2. Find the `RoleGate` function
3. Comment out these lines:
```typescript
// Restrict super admin access to only Mr Alfred Phelix
// if (profile.role === 'super_admin' && profile.email && profile.email !== 'phelixinvestment@gmail.com') {
//   console.log('Super admin access denied. Email:', profile.email)
//   return <Navigate to="/" replace />
// }
```
4. Save the file
5. Refresh the page
6. Try accessing the super admin panel

#### Option C: Update Your Super Admin Email

If you want to use a different email for super admin:

1. Open `src/App.tsx`
2. Find this line:
```typescript
if (profile.role === 'super_admin' && profile.email && profile.email !== 'phelixinvestment@gmail.com') {
```
3. Change `phelixinvestment@gmail.com` to your actual email
4. Save the file
5. Refresh the page

#### Option D: Check/Update Your Profile in Supabase

1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Open the `profiles` table
4. Find your super admin user
5. Check if the `email` field is populated
6. If not, update it manually
7. Also verify the `role` is set to `super_admin`

---

## Quick Test Checklist

After applying fixes:

### For Issue 1 (RLS):
- [ ] Run the SQL fix in Supabase
- [ ] Try creating an evacuation document
- [ ] Verify no error appears
- [ ] Check that tracking data is created

### For Issue 2 (Super Admin):
- [ ] Check your email in browser console
- [ ] Either update email in code or update email in Supabase
- [ ] Sign out and sign back in
- [ ] Try accessing super admin panel
- [ ] Verify content displays correctly

---

## Still Having Issues?

### For RLS Error:
1. Verify the SQL executed successfully
2. Check Supabase logs for errors
3. Ensure trigger exists in Database → Triggers
4. Try creating a new record

### For Super Admin Panel:
1. Open browser console (F12)
2. Look for error messages
3. Check if you're actually logged in as super_admin
4. Verify your profile has the correct role in Supabase
5. Try temporarily disabling the email check (Option B above)

---

## Important Notes

⚠️ **Email Restriction**: The email restriction is a security feature. If you disable it for testing, remember to re-enable it before production.

⚠️ **Supabase Changes**: The SQL fix for RLS is permanent and safe. It only affects how triggers work, not user permissions.

✅ **Recommended Approach**: Update your super admin email in Supabase to match `phelixinvestment@gmail.com` or update the code to use your actual email.

---

## Need More Help?

- Check `RLS_FIX_GUIDE.md` for detailed RLS fix info
- Check `SUPABASE_MIGRATION_GUIDE.md` for database issues
- Check browser console for detailed error messages
- Check Supabase Dashboard logs for database errors
