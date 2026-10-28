# Evacuation Feature Integration - Setup Guide

## Overview
This guide explains how to integrate the evacuation feature into the Phelix CMS. The evacuation module allows authorized officers to process container evacuations, generate documents, and provides Super Admin (Mr Phelix) with full visibility of all evacuation operations.

## Latest Updates (Version 2.0)
The evacuation system has been significantly enhanced with the following new features:

1. **Super Admin Access Restriction**: Only Mr Alfred Phelix (phelixinvestment@gmail.com) can access super admin features
2. **Evacuation Quota Management**: Super Admin can set and track evacuation quotas per shipping line
3. **Activity Tracking Dashboard**: Real-time tracking of evacuation activities by day, officer, and shipping line
4. **Edit Functionality**: Officers can edit their own evacuation records to correct mistakes
5. **Evacuations Done Tab**: New tab for viewing and managing completed evacuations with search, edit, and reprocess features
6. **UI Icons**: Icons added to all form fields, navigation items, and buttons for better UX
7. **Smart Animations**: Loading animations for form submission and account creation with success indicators
8. **Automatic Tracking**: Database triggers automatically track evacuation activity for the dashboard

## Features Implemented

### 1. New Role: Evacuation Officer
- Added `evacuation_officer` role to the system
- Can access the Evacuation Panel to process container evacuations
- Can generate and download/print evacuation documents
- Can edit their own evacuation records if mistakes are made
- Can view and manage completed evacuations via "Evacuations Done" tab

### 2. Evacuation Officer Form
The form includes all required fields:
- **Container Information**: Container Number, Weight, Usage/Status/Type, Shipping Line
- **Truck Information**: Driver Name, License Plate
- **Timing**: Delivered At date, Gate Out Time
- **Document References**: Export Receipt Number, Booking Number, Barcode Number
- **Additional**: Remarks section
- **Signatories**: Terminal Clerk, Clerk, Truck Driver, Customs
- **Condition Statement**: "This equipment was received/Delivered in good condition except as noted above"

### 3. Duplicate Container Detection
- System automatically checks if a container number has already been processed
- Shows an error message if duplicate container is detected
- Prevents submission of duplicate evacuations

### 4. Super Admin Dashboard
- Mr Phelix (Super Admin) can view all evacuation operations
- Real-time notifications when new evacuations are processed
- Statistics: Total evacuations, today's count, weekly count, active officers
- Filter by officer or date
- View detailed information for each evacuation
- Download/print documents for any evacuation record
- **NEW**: Access restricted to only Mr Alfred Phelix (email: phelixinvestment@gmail.com)

### 5. Document Generation
Each evacuation record can generate documents in three formats:
- **Print**: Direct print dialog
- **PDF**: Download as PDF (via print dialog)
- **Word**: Download as RTF file (compatible with Word)

### 6. Notification System
- Super Admin receives automatic notifications when evacuations are processed
- Notifications include: Officer name, container number, plate, weight, shipping line
- Mark notifications as read/unread
- Real-time updates via Supabase subscriptions

### 7. UI Icons and Animations (NEW)
- **Sign In/Sign Up Forms**: Icons added to form fields
  - Email field: Mail icon
  - Password field: Lock icon
  - Full Name field (Sign Up): User icon
- **Navigation Tabs**: Icons added to all navigation items
  - Overview: LayoutDashboard icon
  - Accounting: Calculator icon
  - Operations: Users icon
  - Fuel Monitoring: Fuel icon
  - Evacuations: Activity icon
  - Evacuation Quota: ClipboardList icon
  - Audit Log: FileText icon
  - Sign Out: LogOut icon
- **Process Now Button**: Smart loading animation
  - Shows loading spinner with "Processing..." message
  - Shows green checkmark with "Document Processed Successfully!" message
  - Auto-dismisses after 3 seconds
- **Account Creation**: Success animation
  - Shows green checkmark animation when account is created
  - Displays "Account Created Successfully!" message
  - Auto-redirects to sign in after 3 seconds

### 8. Evacuation Quota Management (NEW)
- Super Admin can set total evacuation quotas for each shipping line
- Shipping lines: Grimaldi, CMA CGM, MAERSK LINE, MSC, HAPAG LLYOD
- Real-time tracking of current evacuations vs. quota
- Ability to reset current evacuation counts
- Visual display of remaining evacuations per shipping line

### 9. Evacuation Activity Tracking (NEW)
- Automatic tracking of all evacuation activities by day
- Displays which officers completed evacuations on which days
- Shows shipping lines and amounts done per officer per day
- Table format for easy viewing:
  - Days: Monday through Sunday
  - Columns: Mr Panford, Mr Kempess, Mr Chair, Mr Joe, Mr Alfred Phelix
  - Each cell shows shipping line and amount done

### 10. Edit Functionality for Evacuation Officers (NEW)
- Officers can edit their own evacuation records from the Evacuation Panel
- "Recent Evacuations" section shows last 10 records
- Edit button on each record allows modifications
- Form switches to edit mode with existing data pre-filled
- Cancel button to exit edit mode without saving

### 11. Evacuations Done Tab (NEW)
- New navigation tab for evacuation officers
- View all completed evacuations
- Search functionality by container number, license plate, or shipping line
- Edit any completed evacuation record
- Reprocess evacuation (creates a new record based on existing one)
- Table view with all relevant information

## Database Schema Changes

### New Tables
1. **evacuation_records**: Stores all evacuation data
2. **evacuation_notifications**: Stores notifications for Super Admin
3. **evacuation_quotas**: Stores evacuation quotas per shipping line (NEW)
4. **evacuation_tracking**: Tracks evacuation activity by day and officer (NEW)

### Updated Tables
1. **profiles**: Updated role enum to include `evacuation_officer`
2. **audit_logs**: Updated role enum

### New Storage Bucket
- **evacuation-docs**: For storing evacuation-related documents

## Installation Steps

### Step 1: Run the SQL Migrations (IMPORTANT - Three Parts Required)

Due to PostgreSQL enum limitations, the migration is split into parts that must be run sequentially:

**Part 1: Add the new enum value**
1. Open your Supabase SQL Editor
2. Open the file: `supabase/06_evacuation_integration.sql`
3. Execute the SQL script (this adds `evacuation_officer` to the enum)
4. Wait for it to complete successfully
5. **Note**: If you get an error saying "enum value already exists", that's fine! It means the value was already added. Just proceed to Part 2.

**Part 2: Create tables and functionality**
1. Open a new query in your Supabase SQL Editor
2. Open the file: `supabase/06_evacuation_integration_part2.sql`
3. Execute the SQL script (this creates all tables, triggers, and policies)
4. Verify that the migration completed successfully

**Part 3: Add quota and tracking system (NEW)**
1. Open a new query in your Supabase SQL Editor
2. Open the file: `supabase/07_evacuation_quota_tracking.sql`
3. Execute the SQL script (this creates quota and tracking tables)
4. Verify that the migration completed successfully

**Why multiple parts?**
PostgreSQL requires that new enum values be committed before they can be used in other database objects. Running Part 1 first ensures the new enum value is available for Part 2 to use. Part 3 adds the new quota and tracking features.

### Step 2: Create User Accounts
You need to create the following user accounts in Supabase Auth:

#### Mr Alfred Phelix (Super Admin)
- Email: `phelixinvestment@gmail.com` (CRITICAL - this exact email is required for super admin access)
- Password: (set secure password)
- Role: `super_admin`
- Full Name: Mr Alfred Phelix
- **IMPORTANT**: Super admin access is restricted to ONLY this email address

#### Mr Panford Beckley (Evacuation Officer)
- Email: (use actual email)
- Password: (set secure password)
- Role: `evacuation_officer`
- Full Name: Mr Panford Beckley

#### Mr Mario Kempess (Evacuation Officer)
- Email: (use actual email)
- Password: (set secure password)
- Role: `evacuation_officer`
- Full Name: Mr Mario Kempess

#### Mr Chair (Evacuation Officer)
- Email: (use actual email)
- Password: (set secure password)
- Role: `evacuation_officer`
- Full Name: Mr Chair

#### Mr Joe (Evacuation Officer)
- Email: (use actual email)
- Password: (set secure password)
- Role: `evacuation_officer`
- Full Name: Mr Joe

**To create users:**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. In the user's metadata, add:
   ```json
   {
     "full_name": "Full Name",
     "role": "evacuation_officer"
   }
   ```
5. Click "Create user"

### Step 3: Update Frontend Configuration
The frontend has been updated with:
- New evacuation pages (`EvacuationPanel.tsx`, `EvacuationDashboard.tsx`, `EvacuationsDone.tsx`)
- New admin page (`EvacuationQuota.tsx`)
- Updated navigation in `Shell.tsx` with icons
- Updated routes in `App.tsx`
- Updated types in `types/index.ts` (added email to Profile, new quota/tracking types)
- Updated role options in `Login.tsx`
- Added super admin email restriction in `App.tsx`
- Added icons and animations to `Login.tsx`
- Added edit functionality to `EvacuationPanel.tsx`

No additional frontend configuration is needed.

### Step 4: Test the System

#### Test as Evacuation Officer (e.g., Mr Panford Beckley)
1. Log in with evacuation officer credentials
2. Navigate to "Evacuation Panel"
3. Fill out the evacuation form with test data
4. Verify that duplicate container detection works (try entering the same container twice)
5. Submit the form
6. Verify loading animation appears during processing
7. Verify success animation with green checkmark appears
8. Test Print, PDF, and Word download functionality
9. Navigate to "Evacuations Done" tab
10. Verify you can see your completed evacuations
11. Test search functionality
12. Test editing a record
13. Test reprocessing a record
14. Return to "Evacuation Panel" and verify "Recent Evacuations" section
15. Test editing a recent evacuation

#### Test as Super Admin (Mr Alfred Phelix)
1. Log in with Super Admin credentials (phelixinvestment@gmail.com)
2. Verify that only this email can access super admin features
3. Navigate to "Evacuations" in the sidebar
4. Verify you can see the evacuation record created by the officer
5. Check that you received a notification
6. Test filtering by officer and date
7. Test viewing statistics
8. Test downloading/printing documents from the dashboard
9. Navigate to "Evacuation Quota" in the sidebar
10. Set evacuation quotas for each shipping line
11. Verify current evacuation counts update automatically
12. Test resetting current evacuation counts
13. View the evacuation activity tracking table
14. Verify it shows officer activities by day and shipping line

#### Test UI Icons and Animations
1. Log out and go to login page
2. Verify icons appear in email, password, and full name fields
3. Create a new account
4. Verify success animation appears
5. Log in and verify navigation icons appear
6. Verify sign out icon appears
7. Navigate to evacuation panel and submit a form
8. Verify loading animation appears
9. Verify success animation with green checkmark appears

## File Changes Summary

### Database Files
- `supabase/06_evacuation_integration.sql` - New migration file (enum update)
- `supabase/06_evacuation_integration_part2.sql` - New migration file (tables and policies)
- `supabase/07_evacuation_quota_tracking.sql` - New migration file (quota and tracking system)

### Frontend Files
- `src/types/index.ts` - Added EvacuationRecord, EvacuationNotification, EvacuationQuota, EvacuationTracking types; added email to Profile; added evacuation_officer role
- `src/pages/Login.tsx` - Added evacuation_officer to role selection; added icons to form fields; added account creation animation
- `src/components/layout/Shell.tsx` - Added evacuation navigation items; added icons to all navigation items
- `src/App.tsx` - Added evacuation routes; added super admin email restriction
- `src/contexts/AuthContext.tsx` - Updated to include email in profile loading
- `src/pages/evacuation/EvacuationPanel.tsx` - Updated: Evacuation Officer form; added edit functionality; added loading animation; added recent evacuations section
- `src/pages/evacuation/EvacuationDashboard.tsx` - Existing file: Super Admin evacuation dashboard
- `src/pages/evacuation/EvacuationsDone.tsx` - New file: View and manage completed evacuations
- `src/pages/admin/EvacuationQuota.tsx` - New file: Manage evacuation quotas and view activity tracking

## Security Considerations

### Row Level Security (RLS)
- Evacuation officers can only view their own evacuation records
- Super Admin can view all evacuation records
- Notifications are only accessible to Super Admin
- Document storage is restricted to evacuation officers and Super Admin
- Evacuation quotas and tracking data are only accessible to Super Admin
- Super admin access is restricted to only Mr Alfred Phelix (phelixinvestment@gmail.com)

### Data Validation
- Container numbers are automatically converted to uppercase
- License plates are automatically converted to uppercase
- Duplicate container numbers are prevented at database level (unique constraint)
- All required fields are validated before submission
- Quota values must be non-negative integers
- Tracking data is automatically populated via database triggers

## Access Control

### Who Can See What

**Evacuation Officers (Mr Panford Beckley, Mr Mario Kempess, Mr Chair, Mr Joe):**
- Can access Evacuation Panel
- Can create evacuation records
- Can edit their own evacuation records
- Can view their own evacuation records
- Can access "Evacuations Done" tab to view and manage completed evacuations
- Can generate/print/download documents for their records
- Can reprocess evacuation records
- Cannot see other officers' records

**Super Admin (Mr Alfred Phelix - phelixinvestment@gmail.com ONLY):**
- Can access Evacuation Dashboard
- Can view ALL evacuation records from all officers
- Receives real-time notifications for all evacuations
- Can view statistics and analytics
- Can generate/print/download documents for any record
- Can filter and search records
- Can access Evacuation Quota management
- Can set evacuation quotas per shipping line
- Can view evacuation activity tracking by day and officer
- Can reset current evacuation counts
- **IMPORTANT**: Only phelixinvestment@gmail.com can access super admin features

**Other Roles (Accountant, Operations Supervisor, Fuel Attendant):**
- Cannot access evacuation features
- Evacuation navigation is hidden for these roles

## Troubleshooting

### Issue: Container number validation not working
**Solution:** Ensure the SQL migration was run successfully and the `container_exists` function exists in Supabase.

### Issue: Officers cannot see Evacuation Panel
**Solution:** Verify that:
1. The user's role is set to `evacuation_officer` in the profiles table
2. The SQL migration updated the app_role enum correctly
3. The user is logged out and back in after role change

### Issue: Super Admin not receiving notifications
**Solution:** Verify that:
1. The trigger `notify_super_admin_on_evacuation_trigger` exists
2. There is a user with role `super_admin` in the profiles table
3. The notification table has the correct RLS policies

### Issue: Document download not working
**Solution:** The Word download uses RTF format which is compatible with Word. For PDF, the system uses the browser's print dialog which allows "Save as PDF". This is the most reliable cross-platform solution.

### Issue: Super Admin access denied (NEW)
**Solution:** Verify that:
1. The user's email is exactly `phelixinvestment@gmail.com`
2. The user's role is set to `super_admin` in the profiles table
3. The user is logged out and back in after email/role change
4. No other users have the super_admin role

### Issue: Evacuation quota not updating (NEW)
**Solution:** Verify that:
1. The SQL migration `07_evacuation_quota_tracking.sql` was run successfully
2. The trigger `trigger_track_evacuation_activity` exists
3. The evacuation_quotas table has the correct RLS policies
4. The shipping_line field is set in evacuation records

### Issue: Evacuation tracking table empty (NEW)
**Solution:** Verify that:
1. Evacuation records are being created with shipping_line information
2. The trigger `trigger_track_evacuation_activity` is firing
3. Check the evacuation_tracking table for data
4. Ensure officers have processed evacuations with shipping lines set

### Issue: Icons not displaying (NEW)
**Solution:** Verify that:
1. lucide-react package is installed (check package.json)
2. Icons are properly imported in the components
3. No console errors related to icon components

### Issue: Animations not showing (NEW)
**Solution:** Verify that:
1. Animation state variables are properly set
2. CSS animations are not being blocked
3. No JavaScript errors in the console
4. Browser supports CSS animations

## Next Steps

1. **Create User Accounts**: Set up the actual email accounts for all evacuation officers (Mr Panford Beckley, Mr Mario Kempess, Mr Chair, Mr Joe)
2. **Verify Super Admin Email**: Ensure Mr Alfred Phelix's email is exactly `phelixinvestment@gmail.com`
3. **Test Workflow**: Perform end-to-end testing with actual users
4. **Test All New Features**: Test quota management, activity tracking, edit functionality, and animations
5. **Customize**: Adjust field labels, validation rules, or document templates as needed
6. **Train Users**: Provide training to evacuation officers on how to use the system, including new edit and reprocess features
7. **Monitor**: Regularly check the Super Admin dashboard to monitor evacuation operations and quota usage
8. **Set Initial Quotas**: Have the Super Admin set appropriate evacuation quotas for each shipping line

## Support

For issues or questions:
1. Check the Supabase logs for database errors
2. Review the browser console for frontend errors
3. Verify that all SQL migrations ran successfully
4. Ensure user roles are correctly set in the profiles table
