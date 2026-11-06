import * as XLSX from 'xlsx'

export interface EvacuationExportData {
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
  payment_status: 'paid' | 'not_paid' | null
  payment_date: string | null
  payment_notes: string | null
}

export function exportEvacuationsToExcel(
  data: EvacuationExportData[],
  filename: string = 'evacuation_records.xlsx'
) {
  // Format data for Excel - matching the design from the image
  const formattedData = data.map((record, index) => ({
    'S/N': index + 1,
    'Container Number': record.container_number,
    'Container Weight (kg)': record.container_weight,
    'Usage/Status/Type': record.usage_status_type,
    'Truck Driver Name': record.truck_driver_name,
    'Truck License Plate': record.truck_license_plate,
    'Delivered At': new Date(record.delivered_at).toLocaleDateString(),
    'Gate Out Time': record.gate_out_time
      ? new Date(record.gate_out_time).toLocaleString()
      : 'N/A',
    'Shipping Line': record.shipping_line || 'N/A',
    'Export Receipt Number': record.export_receipt_number || 'N/A',
    'Booking Number': record.booking_number || 'N/A',
    'Barcode Number': record.barcode_number || 'N/A',
    'Remarks': record.remarks || 'N/A',
    'Terminal Clerk Name': record.terminal_clerk_name || 'N/A',
    'Clerk Name': record.clerk_name || 'N/A',
    'Truck Driver Signature': record.truck_driver_signature || 'N/A',
    'Customs Signature': record.customs_signature || 'N/A',
    'Condition Statement': record.condition_statement,
    'Officer Name': record.officer_name,
    'Officer Email': record.officer_email,
    'Processed At': new Date(record.processed_at).toLocaleString(),
    'Payment Status': record.payment_status === 'paid' ? 'PAID' : record.payment_status === 'not_paid' ? 'NOT PAID' : 'PENDING',
    'Payment Date': record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'N/A',
    'Payment Notes': record.payment_notes || 'N/A',
  }))


  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData)

  // Set column widths - optimized for the new format
  const columnWidths = [
    { wch: 8 },  // S/N
    { wch: 20 }, // Container Number
    { wch: 18 }, // Container Weight
    { wch: 25 }, // Usage/Status/Type
    { wch: 20 }, // Truck Driver Name
    { wch: 18 }, // Truck License Plate
    { wch: 15 }, // Delivered At
    { wch: 20 }, // Gate Out Time
    { wch: 15 }, // Shipping Line
    { wch: 20 }, // Export Receipt Number
    { wch: 18 }, // Booking Number
    { wch: 18 }, // Barcode Number
    { wch: 30 }, // Remarks
    { wch: 20 }, // Terminal Clerk Name
    { wch: 18 }, // Clerk Name
    { wch: 22 }, // Truck Driver Signature
    { wch: 18 }, // Customs Signature
    { wch: 40 }, // Condition Statement
    { wch: 20 }, // Officer Name
    { wch: 25 }, // Officer Email
    { wch: 22 }, // Processed At
    { wch: 15 }, // Payment Status
    { wch: 15 }, // Payment Date
    { wch: 30 }, // Payment Notes
  ]
  worksheet['!cols'] = columnWidths

  // Add header styling
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  for (let C = 0; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!worksheet[address]) continue
    worksheet[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center' }
    }
  }

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Evacuation Records')

  // Generate filename with timestamp - ensure .xlsx extension
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const baseFilename = filename.replace(/\.xlsx$/i, '') // Remove any existing extension
  const fullFilename = `${baseFilename}_${timestamp}.xlsx`

  // Download file with explicit bookType to ensure .xlsx format
  XLSX.writeFile(workbook, fullFilename, { bookType: 'xlsx', type: 'binary' })
}

export function exportFilteredEvacuationsToExcel(
  data: EvacuationExportData[],
  filter: {
    startDate?: string
    endDate?: string
    officerId?: string
    shippingLine?: string
    paymentStatus?: 'paid' | 'not_paid' | null
  },
  filename: string = 'evacuation_records_filtered.xlsx'
) {
  // Apply filters
  let filteredData = data

  if (filter.startDate) {
    filteredData = filteredData.filter(
      (record) => new Date(record.delivered_at) >= new Date(filter.startDate!)
    )
  }

  if (filter.endDate) {
    filteredData = filteredData.filter(
      (record) => new Date(record.delivered_at) <= new Date(filter.endDate!)
    )
  }

  if (filter.officerId) {
    filteredData = filteredData.filter(
      (record) => record.officer_name === filter.officerId
    )
  }

  if (filter.shippingLine) {
    filteredData = filteredData.filter(
      (record) => record.shipping_line === filter.shippingLine
    )
  }

  if (filter.paymentStatus) {
    filteredData = filteredData.filter(
      (record) => record.payment_status === filter.paymentStatus
    )
  }

  // Export filtered data
  exportEvacuationsToExcel(filteredData, filename)
}
