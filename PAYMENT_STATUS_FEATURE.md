# Evacuation Payment Status Feature

## Overview

The payment status feature allows evacuation officers to track whether each evacuation has been paid or not. This information is included in the Excel export for reporting and record-keeping purposes.

## What Was Added

### 1. Database Changes (`supabase/14_evacuation_payment_status.sql`)

New columns added to `evacuation_records` table:
- `payment_status` - 'paid', 'not_paid', or null (pending)
- `payment_date` - Timestamp when payment was marked
- `payment_confirmed_by` - ID of the officer who confirmed payment
- `payment_notes` - Additional payment information

### 2. Type Updates (`src/types/index.ts`)

Updated `EvacuationRecord` interface to include payment status fields.

### 3. Form Updates (`src/pages/evacuation/EvacuationPanel.tsx`)

Added payment status section with:
- "Paid" checkbox (green)
- "Not Paid" checkbox (red)
- "Payment Notes" textarea (optional)

### 4. Export Updates (`src/lib/excelExport.ts`)

Updated Excel export to include:
- Payment Status column (PAID, NOT PAID, or PENDING)
- Payment Date column
- Payment Notes column
- Serial Number (S/N) column
- Formatted headers with blue background
- Optimized column widths

### 5. Display Updates (`src/pages/evacuation/EvacuationsDone.tsx`)

Added payment status column to the table showing:
- Green badge for "PAID"
- Red badge for "NOT PAID"
- Gray badge for "PENDING"

## How to Use

### Setting Payment Status (Evacuation Officer)

1. Sign in as Evacuation Officer
2. Navigate to **Evacuations Done** (`/evacuation/done`)
3. Click **Edit** on a record
4. In the **Payment Status** section:
   - Check **Paid** if the evacuation has been paid
   - Check **Not Paid** if the evacuation has not been paid
   - Optionally add payment notes
5. Click **Update Record**

### Viewing Payment Status

- **In Evacuations Done**: Each record shows a colored badge indicating payment status
- **In Excel Export**: Payment status is included in the spreadsheet

### Exporting with Payment Status

When you export to Excel, the file will include:
- Serial Number (S/N)
- All existing evacuation fields
- **Payment Status** (PAID/NOT PAID/PENDING)
- **Payment Date** (when status was set)
- **Payment Notes** (if any)

## Excel Export Format

The exported Excel file now includes these columns:

1. S/N (Serial Number)
2. Container Number
3. Container Weight (kg)
4. Usage/Status/Type
5. Truck Driver Name
6. Truck License Plate
7. Delivered At
8. Gate Out Time
9. Shipping Line
10. Export Receipt Number
11. Booking Number
12. Barcode Number
13. Remarks
14. Terminal Clerk Name
15. Clerk Name
16. Truck Driver Signature
17. Customs Signature
18. Condition Statement
19. Officer Name
20. Officer Email
21. Processed At
22. **Payment Status** (NEW)
23. **Payment Date** (NEW)
24. **Payment Notes** (NEW)

## Payment Status Values

- **PAID** - The evacuation has been paid for
- **NOT PAID** - The evacuation has not been paid for
- **PENDING** - Payment status has not been set yet

## Visual Indicators

### In the UI
- **PAID**: Green badge with "PAID" text
- **NOT PAID**: Red badge with "NOT PAID" text
- **PENDING**: Gray badge with "PENDING" text

### In Excel
- **PAID**: Uppercase "PAID"
- **NOT PAID**: Uppercase "NOT PAID"
- **PENDING**: Uppercase "PENDING"

## SQL Script

Run this script in Supabase SQL Editor:

```sql
-- File: supabase/14_evacuation_payment_status.sql
```

This script:
- Adds payment status columns to evacuation_records
- Creates indexes for payment status queries
- Updates RLS policies to allow officers to update payment status
- Creates a function to get payment statistics

## Permissions

- **Evacuation Officers**: Can update payment status for their own records
- **Super Admin**: Can view and update payment status for all records
- This is enforced by RLS policies

## Payment Statistics

The system includes a function to get payment statistics:

```sql
select * from get_payment_statistics();
```

Returns:
- Total evacuations
- Paid evacuations
- Not paid evacuations
- Pending payment
- Total value (can be updated if you track payment amounts)

## Testing

### Test Payment Status

1. Sign in as Evacuation Officer
2. Create an evacuation record
3. Go to Evacuations Done
4. Edit the record
5. Check "Paid" checkbox
6. Add payment notes
7. Save
8. Verify the payment status badge appears green

### Test Excel Export

1. Create records with different payment statuses
2. Export to Excel
3. Open the Excel file
4. Verify payment status column is present
5. Verify payment date and notes are included

## Implementation Notes

### Checkbox Behavior
- Only one checkbox can be selected at a time
- Unchecking a checkbox clears the payment status
- Payment status is only saved when the record is updated

### Payment Date
- Automatically set to current timestamp when payment status is set
- Cannot be manually set (auto-generated)

### Payment Notes
- Optional field for additional information
- Can be updated without changing payment status

## Future Enhancements

Potential improvements:
- Add payment amount tracking
- Add payment method field (cash, transfer, etc.)
- Add payment receipt upload
- Create payment reports by date range
- Add payment notifications to super admin
- Filter evacuations by payment status

## Troubleshooting

### Issue: Payment status not showing in Excel

**Solution**: Make sure you ran the SQL migration script and the React app has been restarted after the changes.

### Issue: Can't update payment status

**Solution**: Check that you're signed in as the evacuation officer who created the record, or as super admin.

### Issue: Payment status column not in database

**Solution**: Run the `14_evacuation_payment_status.sql` script in Supabase SQL Editor.

## Database Schema

```sql
alter table evacuation_records
add column payment_status text
  check (payment_status in ('paid', 'not_paid', null))
  default null;

alter table evacuation_records
add column payment_date timestamptz;

alter table evacuation_records
add column payment_confirmed_by uuid references profiles(id);

alter table evacuation_records
add column payment_notes text;
```

## Summary

The payment status feature provides a simple way to track payment information for each evacuation. Officers can easily mark evacuations as paid or not paid, and this information is included in Excel exports for reporting purposes.
