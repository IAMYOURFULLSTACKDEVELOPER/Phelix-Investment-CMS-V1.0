import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import type { EvacuationRecord } from '../../types'
import { CheckCircle, Loader2, Edit } from 'lucide-react'

export default function EvacuationPanel() {
  const { profile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [containerError, setContainerError] = useState<string | null>(null)
  const [generatedRecord, setGeneratedRecord] = useState<EvacuationRecord | null>(null)
  const [showProcessAnimation, setShowProcessAnimation] = useState(false)
  const [animationStep, setAnimationStep] = useState<'loading' | 'success' | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [recentRecords, setRecentRecords] = useState<EvacuationRecord[]>([])

  useEffect(() => {
    loadRecentRecords()
  }, [profile])

  async function loadRecentRecords() {
    if (!profile) return

    const { data, error } = await supabase
      .from('evacuation_records')
      .select('*')
      .eq('processed_by', profile.id)
      .order('processed_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error loading recent records:', error)
    } else {
      setRecentRecords(data as EvacuationRecord[])
    }
  }

  function handleEditRecord(record: EvacuationRecord) {
    setEditMode(true)
    setEditingRecordId(record.id)
    setFormData({
      truck_driver_name: record.truck_driver_name,
      truck_license_plate: record.truck_license_plate,
      delivered_at: record.delivered_at,
      container_number: record.container_number,
      container_weight: record.container_weight.toString(),
      usage_status_type: record.usage_status_type,
      export_receipt_number: record.export_receipt_number || '',
      booking_number: record.booking_number || '',
      barcode_number: record.barcode_number || '',
      remarks: record.remarks || '',
      terminal_clerk_name: record.terminal_clerk_name || '',
      clerk_name: record.clerk_name || '',
      truck_driver_signature: record.truck_driver_signature || '',
      customs_signature: record.customs_signature || '',
      shipping_line: record.shipping_line || '',
      gate_out_time: record.gate_out_time ? record.gate_out_time.slice(0, 16) : ''
    })
  }

  async function handleUpdateRecord(e: FormEvent) {
    e.preventDefault()

    if (!editingRecordId) return

    setSubmitting(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('evacuation_records')
        .update({
          container_number: formData.container_number.trim().toUpperCase(),
          container_weight: parseFloat(formData.container_weight),
          usage_status_type: formData.usage_status_type,
          truck_driver_name: formData.truck_driver_name,
          truck_license_plate: formData.truck_license_plate.trim().toUpperCase(),
          delivered_at: formData.delivered_at,
          gate_out_time: formData.gate_out_time ? new Date(formData.gate_out_time).toISOString() : null,
          shipping_line: formData.shipping_line || null,
          export_receipt_number: formData.export_receipt_number || null,
          booking_number: formData.booking_number || null,
          barcode_number: formData.barcode_number || null,
          remarks: formData.remarks || null,
          terminal_clerk_name: formData.terminal_clerk_name || null,
          clerk_name: formData.clerk_name || null,
          truck_driver_signature: formData.truck_driver_signature || null,
          customs_signature: formData.customs_signature || null
        })
        .eq('id', editingRecordId)

      if (error) {
        console.error('Update error:', error)
        setError(error.message)
        return
      }

      setEditMode(false)
      setEditingRecordId(null)
      loadRecentRecords()

      // Reset form
      setFormData({
        truck_driver_name: '',
        truck_license_plate: '',
        delivered_at: '',
        container_number: '',
        container_weight: '',
        usage_status_type: '',
        export_receipt_number: '',
        booking_number: '',
        barcode_number: '',
        remarks: '',
        terminal_clerk_name: '',
        clerk_name: '',
        truck_driver_signature: '',
        customs_signature: '',
        shipping_line: '',
        gate_out_time: ''
      })
    } catch (err) {
      console.error('Update error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancelEdit() {
    setEditMode(false)
    setEditingRecordId(null)
    setFormData({
      truck_driver_name: '',
      truck_license_plate: '',
      delivered_at: '',
      container_number: '',
      container_weight: '',
      usage_status_type: '',
      export_receipt_number: '',
      booking_number: '',
      barcode_number: '',
      remarks: '',
      terminal_clerk_name: '',
      clerk_name: '',
      truck_driver_signature: '',
      customs_signature: '',
      shipping_line: '',
      gate_out_time: ''
    })
  }

  // Form state
  const [formData, setFormData] = useState({
    truck_driver_name: '',
    truck_license_plate: '',
    delivered_at: '',
    container_number: '',
    container_weight: '',
    usage_status_type: '',
    export_receipt_number: '',
    booking_number: '',
    barcode_number: '',
    remarks: '',
    terminal_clerk_name: '',
    clerk_name: '',
    truck_driver_signature: '',
    customs_signature: '',
    shipping_line: '',
    gate_out_time: ''
  })

  async function checkContainerExists(containerNumber: string) {
    const { data, error } = await supabase.rpc('container_exists', {
      p_container_number: containerNumber
    })
    
    if (error) {
      console.error('Error checking container:', error)
      return false
    }
    
    return data
  }

  async function handleContainerBlur(e: React.FocusEvent<HTMLInputElement>) {
    const containerNumber = e.target.value.trim()
    if (containerNumber.length > 0) {
      const exists = await checkContainerExists(containerNumber)
      if (exists) {
        setContainerError(`Container ${containerNumber} has already been processed and cannot be evacuated again.`)
      } else {
        setContainerError(null)
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (containerError) {
      setError('Please resolve the container number issue before submitting.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(false)
    setAnimationStep('loading')
    setShowProcessAnimation(true)

    try {
      // Check container existence one more time before submission
      const exists = await checkContainerExists(formData.container_number)
      if (exists) {
        setContainerError(`Container ${formData.container_number} has already been processed.`)
        setSubmitting(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('evacuation_records')
        .insert({
          container_number: formData.container_number.trim().toUpperCase(),
          container_weight: parseFloat(formData.container_weight),
          usage_status_type: formData.usage_status_type,
          truck_driver_name: formData.truck_driver_name,
          truck_license_plate: formData.truck_license_plate.trim().toUpperCase(),
          delivered_at: formData.delivered_at,
          gate_out_time: formData.gate_out_time ? new Date(formData.gate_out_time).toISOString() : null,
          shipping_line: formData.shipping_line || null,
          export_receipt_number: formData.export_receipt_number || null,
          booking_number: formData.booking_number || null,
          barcode_number: formData.barcode_number || null,
          remarks: formData.remarks || null,
          terminal_clerk_name: formData.terminal_clerk_name || null,
          clerk_name: formData.clerk_name || null,
          truck_driver_signature: formData.truck_driver_signature || null,
          customs_signature: formData.customs_signature || null,
          processed_by: profile!.id
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        setError(insertError.message)
        return
      }

      setGeneratedRecord(data as EvacuationRecord)
      setSuccess(true)
      setAnimationStep('success')

      // Hide animation after success display
      setTimeout(() => {
        setShowProcessAnimation(false)
        setAnimationStep(null)
      }, 3000)

      // Reset form
      setFormData({
        truck_driver_name: '',
        truck_license_plate: '',
        delivered_at: '',
        container_number: '',
        container_weight: '',
        usage_status_type: '',
        export_receipt_number: '',
        booking_number: '',
        barcode_number: '',
        remarks: '',
        terminal_clerk_name: '',
        clerk_name: '',
        truck_driver_signature: '',
        customs_signature: '',
        shipping_line: '',
        gate_out_time: ''
      })
      setContainerError(null)
    } catch (err) {
      console.error('Form submission error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setShowProcessAnimation(false)
      setAnimationStep(null)
    } finally {
      setSubmitting(false)
    }
  }

  function handlePrint() {
    if (!generatedRecord) return
    const printContent = window.open('', '_blank')
    if (printContent) {
      printContent.document.write(`
        <html>
          <head>
            <title>Evacuation Document - ${generatedRecord.container_number}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0; }
              .section { margin-bottom: 20px; }
              .label { font-weight: bold; }
              .value { margin-left: 10px; }
              .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
              .signature-box { width: 30%; text-align: center; }
              .signature-line { border-top: 1px solid #000; margin-top: 60px; }
              .condition { margin-top: 30px; font-style: italic; border: 1px solid #000; padding: 15px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PHELIX INVESTMENT</h1>
              <h2>Evacuation Document</h2>
              <p>Generated: ${new Date(generatedRecord.processed_at).toLocaleString()}</p>
            </div>
            
            <div class="section">
              <p><span class="label">Container Number:</span><span class="value">${generatedRecord.container_number}</span></p>
              <p><span class="label">Container Weight:</span><span class="value">${generatedRecord.container_weight} kg</span></p>
              <p><span class="label">Usage/Status/Type:</span><span class="value">${generatedRecord.usage_status_type}</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Truck Driver Name:</span><span class="value">${generatedRecord.truck_driver_name}</span></p>
              <p><span class="label">Truck License Plate:</span><span class="value">${generatedRecord.truck_license_plate}</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Delivered At:</span><span class="value">${new Date(generatedRecord.delivered_at).toLocaleDateString()}</span></p>
              <p><span class="label">Gate Out Time:</span><span class="value">${generatedRecord.gate_out_time ? new Date(generatedRecord.gate_out_time).toLocaleString() : 'N/A'}</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Shipping Line:</span><span class="value">${generatedRecord.shipping_line || 'N/A'}</span></p>
              <p><span class="label">Export Receipt Number:</span><span class="value">${generatedRecord.export_receipt_number || 'N/A'}</span></p>
              <p><span class="label">Booking Number:</span><span class="value">${generatedRecord.booking_number || 'N/A'}</span></p>
              <p><span class="label">Barcode Number:</span><span class="value">${generatedRecord.barcode_number || 'N/A'}</span></p>
            </div>
            
            ${generatedRecord.remarks ? `
            <div class="section">
              <p><span class="label">Remarks:</span><span class="value">${generatedRecord.remarks}</span></p>
            </div>
            ` : ''}
            
            <div class="signatures">
              <div class="signature-box">
                <p>Terminal Clerk</p>
                <p>${generatedRecord.terminal_clerk_name || 'N/A'}</p>
                <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                <p>Clerk</p>
                <p>${generatedRecord.clerk_name || 'N/A'}</p>
                <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                <p>Truck Driver</p>
                <p>${generatedRecord.truck_driver_name}</p>
                <div class="signature-line"></div>
              </div>
            </div>
            
            <div class="condition">
              <p>${generatedRecord.condition_statement}</p>
            </div>
            
            <div class="section" style="margin-top: 30px;">
              <p><span class="label">Customs:</span><span class="value">${generatedRecord.customs_signature || 'N/A'}</span></p>
            </div>
          </body>
        </html>
      `)
      printContent.document.close()
      printContent.print()
    }
  }

  function handleDownloadPDF() {
    // For PDF download, we would typically use a library like jsPDF or html2pdf
    // For now, we'll use the print dialog which allows "Save as PDF"
    handlePrint()
  }

  function handleDownloadWord() {
    if (!generatedRecord) return
    // Simple Word document generation using RTF format
    const rtfContent = `
      {\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
      \\f0\\fs24
      \\b\\fs32 PHELIX INVESTMENT\\b0\\par
      \\b\\fs28 Evacuation Document\\b0\\par
      \\par
      Container Number: ${generatedRecord.container_number}\\par
      Container Weight: ${generatedRecord.container_weight} kg\\par
      Usage/Status/Type: ${generatedRecord.usage_status_type}\\par
      \\par
      Truck Driver Name: ${generatedRecord.truck_driver_name}\\par
      Truck License Plate: ${generatedRecord.truck_license_plate}\\par
      \\par
      Delivered At: ${new Date(generatedRecord.delivered_at).toLocaleDateString()}\\par
      Gate Out Time: ${generatedRecord.gate_out_time ? new Date(generatedRecord.gate_out_time).toLocaleString() : 'N/A'}\\par
      \\par
      Shipping Line: ${generatedRecord.shipping_line || 'N/A'}\\par
      Export Receipt Number: ${generatedRecord.export_receipt_number || 'N/A'}\\par
      Booking Number: ${generatedRecord.booking_number || 'N/A'}\\par
      Barcode Number: ${generatedRecord.barcode_number || 'N/A'}\\par
      ${generatedRecord.remarks ? `Remarks: ${generatedRecord.remarks}\\par` : ''}
      \\par
      Terminal Clerk: ${generatedRecord.terminal_clerk_name || 'N/A'}\\par
      Clerk: ${generatedRecord.clerk_name || 'N/A'}\\par
      Truck Driver: ${generatedRecord.truck_driver_name}\\par
      Customs: ${generatedRecord.customs_signature || 'N/A'}\\par
      \\par
      \\i${generatedRecord.condition_statement}\\i0\\par
      }
    `
    
    const blob = new Blob([rtfContent], { type: 'application/rtf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evacuation_${generatedRecord.container_number}.rtf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink mb-2">
            {editMode ? 'Edit Evacuation Record' : 'Evacuation Panel'}
          </h1>
          <p className="text-sm text-ink/60">
            {editMode ? 'Update existing evacuation record' : 'Process container evacuations and generate documentation'}
          </p>
        </div>

        {success && generatedRecord && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Evacuation Processed Successfully!</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-green-600">Container Number:</p>
                <p className="font-semibold text-green-900">{generatedRecord.container_number}</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Truck License Plate:</p>
                <p className="font-semibold text-green-900">{generatedRecord.truck_license_plate}</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Driver Name:</p>
                <p className="font-semibold text-green-900">{generatedRecord.truck_driver_name}</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Processed At:</p>
                <p className="font-semibold text-green-900">{new Date(generatedRecord.processed_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Print Document
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Download as PDF
              </button>
              <button
                onClick={handleDownloadWord}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Download as Word
              </button>
              <button
                onClick={() => setSuccess(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Process Another
              </button>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={editMode ? handleUpdateRecord : handleSubmit} className="space-y-6">
            {/* Container Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Container Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Container Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., UETU7321473"
                    value={formData.container_number}
                    onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                    onBlur={handleContainerBlur}
                    className={`w-full border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all ${
                      containerError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {containerError && (
                    <p className="text-xs text-red-600 mt-1">{containerError}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Container Weight (kg) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="Enter weight"
                    value={formData.container_weight}
                    onChange={(e) => setFormData({ ...formData, container_weight: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Usage/Status/Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Repo To terminal/40HC"
                    value={formData.usage_status_type}
                    onChange={(e) => setFormData({ ...formData, usage_status_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Shipping Line</label>
                  <select
                    value={formData.shipping_line}
                    onChange={(e) => setFormData({ ...formData, shipping_line: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  >
                    <option value="">Select Shipping Line</option>
                    <option value="Grimaldi">Grimaldi</option>
                    <option value="CMA CGM">CMA CGM</option>
                    <option value="MAERSK LINE">MAERSK LINE</option>
                    <option value="MSC">MSC</option>
                    <option value="HAPAG LLYOD">HAPAG LLYOD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Truck Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Truck Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Truck Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter driver's name"
                    value={formData.truck_driver_name}
                    onChange={(e) => setFormData({ ...formData, truck_driver_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Truck License Plate *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., AGL-007"
                    value={formData.truck_license_plate}
                    onChange={(e) => setFormData({ ...formData, truck_license_plate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Timing Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Timing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Delivered At *</label>
                  <input
                    type="date"
                    required
                    value={formData.delivered_at}
                    onChange={(e) => setFormData({ ...formData, delivered_at: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Gate Out Time</label>
                  <input
                    type="datetime-local"
                    value={formData.gate_out_time}
                    onChange={(e) => setFormData({ ...formData, gate_out_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Document References */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Document References</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Export Receipt Number</label>
                  <input
                    type="text"
                    placeholder="Enter receipt number"
                    value={formData.export_receipt_number}
                    onChange={(e) => setFormData({ ...formData, export_receipt_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Booking Number</label>
                  <input
                    type="text"
                    placeholder="Enter booking number"
                    value={formData.booking_number}
                    onChange={(e) => setFormData({ ...formData, booking_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Barcode Number</label>
                  <input
                    type="text"
                    placeholder="Enter barcode number"
                    value={formData.barcode_number}
                    onChange={(e) => setFormData({ ...formData, barcode_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Additional Information</h3>
              <div>
                <label className="text-sm font-medium text-ink block mb-2">Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Enter any additional remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all resize-none"
                />
              </div>
            </div>

            {/* Signatories */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Signatories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Terminal Clerk Name</label>
                  <input
                    type="text"
                    placeholder="Enter terminal clerk's name"
                    value={formData.terminal_clerk_name}
                    onChange={(e) => setFormData({ ...formData, terminal_clerk_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Clerk Name</label>
                  <input
                    type="text"
                    placeholder="Enter clerk's name"
                    value={formData.clerk_name}
                    onChange={(e) => setFormData({ ...formData, clerk_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Truck Driver (Signature)</label>
                  <input
                    type="text"
                    placeholder="Driver's signature"
                    value={formData.truck_driver_signature}
                    onChange={(e) => setFormData({ ...formData, truck_driver_signature: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink block mb-2">Customs (Signature)</label>
                  <input
                    type="text"
                    placeholder="Customs signature"
                    value={formData.customs_signature}
                    onChange={(e) => setFormData({ ...formData, customs_signature: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-ink/80 italic">
                  "This equipment was received/Delivered in good condition except as noted above."
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {editMode && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 border-2 border-gray-300 rounded-lg py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || !!containerError}
                className={`bg-phelix-medium hover:bg-phelix-light text-white border-2 border-white rounded-lg py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${editMode ? 'flex-1' : 'w-full'}`}
              >
                {submitting ? 'Processing...' : (editMode ? 'Update Record' : 'Process Now')}
              </button>
            </div>
          </form>
        )}

        {!success && !editMode && recentRecords.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Recent Evacuations</h3>
            <div className="space-y-3">
              {recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink">{record.container_number}</div>
                    <div className="text-xs text-gray-500">
                      {record.truck_license_plate} • {record.shipping_line || 'N/A'} • {new Date(record.processed_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditRecord(record)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showProcessAnimation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              {animationStep === 'loading' ? (
                <>
                  <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing...</h3>
                  <p className="text-sm text-gray-600">Please wait while we process your evacuation</p>
                </>
              ) : (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Document Processed Successfully!</h3>
                  <p className="text-sm text-gray-600">Your evacuation has been recorded</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
