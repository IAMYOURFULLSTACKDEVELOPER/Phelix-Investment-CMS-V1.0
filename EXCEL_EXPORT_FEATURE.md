# Excel Export Feature for Evacuation Records

## Overview

The Excel export feature allows both Super Admins and Evacuation Officers to export evacuation records to Excel spreadsheets for reporting, analysis, and record-keeping purposes.

## What Was Added

### 1. New Dependency
- Installed `xlsx` package for Excel file generation

### 2. New Utility File
- Created `src/lib/excelExport.ts` with export functions

### 3. Enhanced Pages
- **EvacuationDashboard.tsx** (Super Admin) - Added "Export to Excel" button
- **EvacuationsDone.tsx** (Evacuation Officer) - Added "Export to Excel" button

## Features

### Exported Data Fields

The Excel file includes all relevant evacuation record data:

- Container Number
- Container Weight (kg)
- Usage/Status/Type
- Truck Driver Name
- Truck License Plate
- Delivered At (date)
- Gate Out Time
- Shipping Line
- Export Receipt Number
- Booking Number
- Barcode Number
- Remarks
- Terminal Clerk Name
- Clerk Name
- Truck Driver Signature
- Customs Signature
- Condition Statement
- Officer Name
- Officer Email
- Processed At (timestamp)

### File Naming

Exported files are automatically named with a timestamp:
- Super Admin: `evacuation_records_YYYY-MM-DDTHH-MM-SS-sssZ.xlsx`
- Evacuation Officer: `my_evacuations_YYYY-MM-DDTHH-MM-SS-sssZ.xlsx`

### Excel Formatting

- All columns are auto-sized for readability
- Headers are properly formatted
- Dates are formatted in a human-readable format
- Empty fields show as "N/A"

## How to Use

### For Super Admin

1. Sign in as Super Admin
2. Navigate to **Evacuation Dashboard** (`/evacuation/dashboard`)
3. Click the **"Export to Excel"** button (green button with download icon)
4. The Excel file will download automatically
5. The file contains ALL evacuation records from the system

### For Evacuation Officer

1. Sign in as Evacuation Officer
2. Navigate to **Evacuations Done** (`/evacuation/done`)
3. Click the **"Export to Excel"** button (green button with download icon)
4. The Excel file will download automatically
5. The file contains only YOUR evacuation records

## Export Options

### Current Implementation
- Export all records currently loaded in the view
- No filtering applied (except what's visible in the table)

### Future Enhancements (Optional)
The `excelExport.ts` file includes a `exportFilteredEvacuationsToExcel` function that can be used to add:
- Date range filtering
- Officer filtering
- Shipping line filtering

To implement filtered exports, you would add date range pickers and filter dropdowns to the UI.

## Technical Details

### Export Function Signature

```typescript
exportEvacuationsToExcel(
  data: EvacuationExportData[],
  filename: string = 'evacuation_records.xlsx'
)
```

### Data Structure

```typescript
interface EvacuationExportData {
  container_number: string
  container_weight: number
  usage_status_type: string
  truck_driver_name: string
  truck_license_plate: string
  delivered_at: string
  gate_out_time: string | null
  shipping_line: string | null
  export_receipt_number: string | null
  booking_number: string | null
  barcode_number: string | null
  remarks: string | null
  terminal_clerk_name: string | null
  clerk_name: string | null
  truck_driver_signature: string | null
  customs_signature: string | null
  condition_statement: string
  officer_name: string
  officer_email: string
  processed_at: string
}
```

## Permissions

- **Super Admin**: Can export ALL evacuation records from the system
- **Evacuation Officer**: Can export only THEIR OWN evacuation records
- This is enforced by the RLS policies in Supabase

## Testing

### Test Export for Super Admin

1. Sign in as Super Admin
2. Go to Evacuation Dashboard
3. Click "Export to Excel"
4. Verify file downloads
5. Open the Excel file
6. Verify all records are present
7. Verify all fields are populated correctly

### Test Export for Evacuation Officer

1. Sign in as Evacuation Officer
2. Go to Evacuations Done
3. Click "Export to Excel"
4. Verify file downloads
5. Open the Excel file
6. Verify only your records are present
7. Verify all fields are populated correctly

## Browser Compatibility

The export feature works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Opera

## File Format

- **Format**: `.xlsx` (Excel 2007+)
- **Compatibility**: Opens in Microsoft Excel, Google Sheets, LibreOffice Calc, and other spreadsheet applications

## Performance

- Export is done client-side (no server processing)
- Works efficiently with thousands of records
- No impact on database performance
- Fast download speed

## Security

- Export uses the same RLS policies as the rest of the application
- No additional permissions needed
- Data is fetched according to user's existing access level
- No sensitive data is exposed beyond what the user can already see

## Troubleshooting

### Issue: Export button is disabled

**Solution**: This happens when there are no records to export. Create some evacuation records first.

### Issue: File doesn't download

**Solution**: Check your browser's download settings and ensure downloads are allowed.

### Issue: Excel file won't open

**Solution**: Ensure you have a spreadsheet application installed (Excel, Google Sheets, LibreOffice, etc.).

### Issue: Data appears garbled

**Solution**: This is rare but can happen with special characters. The export function handles most special characters, but very unusual characters might need encoding adjustments.

## Future Enhancements

Potential improvements that could be added:

1. **Filtered Exports**
   - Add date range picker
   - Add shipping line filter
   - Add officer filter (for super admin)

2. **Export Options**
   - Choose which fields to include
   - Export in CSV format
   - Export in PDF format

3. **Batch Operations**
   - Export multiple date ranges
   - Schedule automatic exports
   - Email export to recipients

4. **Formatting Options**
   - Custom column widths
   - Add company logo
   - Add headers/footers
   - Apply styling/colors

## Summary

The Excel export feature provides a simple, efficient way for both Super Admins and Evacuation Officers to export evacuation records for reporting and analysis. The feature is fully integrated with the existing permissions system and requires no additional setup or configuration.
