# Evacuation Dashboard Enhancement - Setup Guide

## Overview

The Super Admin's Evacuation Dashboard has been enhanced to provide comprehensive tracking of all evacuation activities performed by evacuation officers. The dashboard now displays:

- **Total Evacuations** - All-time total
- **Today's Evacuations** - Evacuations performed today
- **This Week's Evacuations** - Evacuations in the last 7 days
- **This Month's Evacuations** - Evacuations in the last 30 days
- **Active Officers** - Officers who performed evacuations today
- **Total Weight** - Sum of all container weights
- **Unique Containers** - Count of unique container numbers
- **Active Officers List** - Detailed view of currently active officers
- **Shipping Line Statistics** - Breakdown by shipping line with quota tracking

## What Was Implemented

### 1. Database Enhancements (`supabase/13_evacuation_dashboard_enhancements.sql`)

New SQL functions and views:

- **`get_evacuation_statistics()`** - Returns comprehensive statistics
- **`get_active_officers()`** - Returns officers active today with their counts
- **`get_evacuation_by_shipping_line()`** - Returns statistics by shipping line
- **`get_recent_evacuations()`** - Returns recent evacuation records
- **`officer_performance_summary`** - View for officer performance metrics

### 2. Frontend Enhancements (`src/pages/evacuation/EvacuationDashboard.tsx`)

Enhanced the dashboard with:
- Real-time statistics using React Query
- Active officers section showing who's working today
- Shipping line statistics with quota tracking
- Additional metrics (monthly, total weight, unique containers)
- Improved performance with dedicated database functions

## Setup Instructions

### Step 1: Run the SQL Script

If you haven't already run the evacuation integration scripts, run them in this order:

1. **Core Schema** (if not already done):
   ```sql
   -- Run: supabase/01_schema.sql
   ```

2. **Evacuation Integration** (if not already done):
   ```sql
   -- Run: supabase/06_evacuation_integration.sql
   ```

3. **Evacuation Quota Tracking** (if not already done):
   ```sql
   -- Run: supabase/07_evacuation_quota_tracking.sql
   ```

4. **Dashboard Enhancements** (NEW):
   ```sql
   -- Run: supabase/13_evacuation_dashboard_enhancements.sql
   ```

### Step 2: Create Evacuation Officer Accounts

Create evacuation officer users:

1. Go to **Authentication** → **Users** → **Add User**
2. Fill in email and password for each officer
3. **Auto Confirm User**: Yes
4. Click **"Create User"**
5. Copy the UUID
6. Create profile entry for each:

```sql
-- Example for an evacuation officer
insert into profiles (id, full_name, role, depot, verification_status)
values
  ('<UUID>', 'Mr Panford', 'evacuation_officer', null, 'approved');
```

### Step 3: Set Up Evacuation Quotas (Optional)

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

### Step 4: Access the Dashboard

1. Sign in as the **Super Admin**
2. Navigate to the **Super Admin Dashboard**
3. Click on **"Evacuation Dashboard"** link
4. View the comprehensive statistics

## Dashboard Features

### Statistics Cards

- **Total Evacuations**: Shows all-time total count
- **Today**: Shows evacuations performed today
- **This Week**: Shows evacuations in the last 7 days
- **Active Officers**: Count of officers active today
- **This Month**: Shows evacuations in the last 30 days
- **Total Weight**: Sum of all container weights in kg
- **Unique Containers**: Count of unique container numbers

### Active Officers Section

Shows officers who performed evacuations today with:
- Officer name and email
- Number of evacuations today
- Total evacuations (all-time)
- Last evacuation time

### Shipping Line Statistics

Shows breakdown by shipping line:
- Total evacuations per shipping line
- Today's evacuations per shipping line
- This week's evacuations per shipping line
- Current quota (if set)
- Remaining quota (current quota - this week's evacuations)

### Recent Evacuations

The main table shows:
- Container number
- Driver name
- License plate
- Container weight
- Shipping line
- Officer name
- Date
- Actions (Print, PDF, Word)

## How It Works

### Automatic Tracking

When an evacuation officer creates an evacuation record:

1. The record is inserted into `evacuation_records`
2. The `track_evacuation_activity()` trigger automatically:
   - Updates the `evacuation_tracking` table
   - Increments the `evacuation_quotas` counter for the shipping line
   - Creates a notification for the super admin
3. The dashboard queries the enhanced functions to show real-time statistics

### Real-Time Updates

The dashboard uses React Query with automatic refetching. When you:
- Navigate to the dashboard
- Change filters
- Return to the dashboard after navigating away

The statistics are automatically refreshed.

### Active Officers Detection

Officers are considered "active" if they have performed at least one evacuation today. The dashboard queries:
- All evacuation records from today
- Groups by officer
- Shows unique officers with their counts

## Troubleshooting

### Issue: Dashboard shows no data

**Solution**: Make sure:
1. Evacuation officers have been created
2. Officers have created evacuation records
3. SQL scripts were run in the correct order
4. The functions exist: `get_evacuation_statistics()`, `get_active_officers()`, etc.

### Issue: "function does not exist" error

**Solution**: Run the dashboard enhancements script:
```sql
-- Run: supabase/13_evacuation_dashboard_enhancements.sql
```

### Issue: Active officers section is empty

**Solution**: This is normal if no evacuations have been performed today. The section will populate as officers perform evacuations.

### Issue: Shipping line quotas show 0

**Solution**: Set quotas for each shipping line:
```sql
update evacuation_quotas
set total_evacuations = <your_quota>
where shipping_line = '<shipping_line>';
```

## Testing the Dashboard

1. **Create test evacuation officers** (if not already done)
2. **Sign in as an evacuation officer**
3. **Create evacuation records** through the evacuation panel
4. **Sign out and sign in as super admin**
5. **Navigate to the evacuation dashboard**
6. **Verify statistics update in real-time**

## SQL Script Summary

### Required Scripts (in order)

1. `01_schema.sql` - Core database schema
2. `12_verification_system.sql` - User verification system
3. `06_evacuation_integration.sql` - EVAC tables and basic tracking
4. `07_evacuation_quota_tracking.sql` - Quota management
5. `13_evacuation_dashboard_enhancements.sql` - **NEW** - Enhanced statistics

### What Each Script Does

**`13_evacuation_dashboard_enhancements.sql`**:
- Creates `get_evacuation_statistics()` function
- Creates `get_active_officers()` function
- Creates `get_evacuation_by_shipping_line()` function
- Creates `get_recent_evacuations()` function
- Creates `officer_performance_summary` view
- Grants necessary permissions
- Sets up RLS policies

## Next Steps

After setup:
1. Create evacuation officer accounts
2. Set evacuation quotas for each shipping line
3. Test with sample evacuation records
4. Verify dashboard displays correctly
5. Monitor active officers and shipping line quotas

## Additional Notes

- The dashboard automatically updates when evacuation records are created
- No manual refresh is needed - React Query handles this
- All statistics are calculated in the database for performance
- The system maintains an audit log of all evacuation activities
- Notifications are automatically sent to the super admin when evacuations occur
