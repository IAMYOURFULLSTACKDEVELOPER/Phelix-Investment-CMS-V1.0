import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import type { EvacuationRecord } from '../../types'
import { Edit, RotateCcw, Search, Calendar } from 'lucide-react'

export default function EvacuationsDone() {
  const { profile } = useAuth()
  const [records, setRecords] = useState<EvacuationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRecord, setEditingRecord] = useState<EvacuationRecord | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<EvacuationRecord>>({})

  useEffect(() => {
    loadRecords()
  }, [profile])

  async function loadRecords() {
    if (!profile) return

    const { data, error } = await supabase
      .from('evacuation_records')
      .select('*')
      .eq('processed_by', profile.id)
      .order('processed_at', { ascending: false })

    if (error) {
      console.error('Error loading records:', error)
    } else {
      setRecords(data as EvacuationRecord[])
    }
    setLoading(false)
  }

  function handleEdit(record: EvacuationRecord) {
    setEditingRecord(record)
    setEditFormData(record)
  }

  async function handleSaveEdit() {
    if (!editingRecord) return

    const { error } = await supabase
      .from('evacuation_records')
      .update({
        container_number: editFormData.container_number?.toUpperCase(),
        container_weight: editFormData.container_weight,
        usage_status_type: editFormData.usage_status_type,
        truck_driver_name: editFormData.truck_driver_name,
        truck_license_plate: editFormData.truck_license_plate?.toUpperCase(),
        delivered_at: editFormData.delivered_at,
        gate_out_time: editFormData.gate_out_time,
        shipping_line: editFormData.shipping_line,
        export_receipt_number: editFormData.export_receipt_number,
        booking_number: editFormData.booking_number,
        barcode_number: editFormData.barcode_number,
        remarks: editFormData.remarks,
        terminal_clerk_name: editFormData.terminal_clerk_name,
        clerk_name: editFormData.clerk_name,
        truck_driver_signature: editFormData.truck_driver_signature,
        customs_signature: editFormData.customs_signature
      })
      .eq('id', editingRecord.id)

    if (error) {
      console.error('Error updating record:', error)
      alert('Failed to update record')
    } else {
      setEditingRecord(null)
      loadRecords()
    }
  }

  async function handleReprocess(record: EvacuationRecord) {
    if (!confirm('Are you sure you want to reprocess this evacuation? This will create a new record.')) {
      return
    }

    const { error } = await supabase
      .from('evacuation_records')
      .insert({
        container_number: record.container_number,
        container_weight: record.container_weight,
        usage_status_type: record.usage_status_type,
        truck_driver_name: record.truck_driver_name,
        truck_license_plate: record.truck_license_plate,
        delivered_at: record.delivered_at,
        gate_out_time: record.gate_out_time,
        shipping_line: record.shipping_line,
        export_receipt_number: record.export_receipt_number,
        booking_number: record.booking_number,
        barcode_number: record.barcode_number,
        remarks: record.remarks,
        terminal_clerk_name: record.terminal_clerk_name,
        clerk_name: record.clerk_name,
        truck_driver_signature: record.truck_driver_signature,
        customs_signature: record.customs_signature,
        processed_by: profile!.id
      })

    if (error) {
      console.error('Error reprocessing record:', error)
      alert('Failed to reprocess record')
    } else {
      alert('Evacuation reprocessed successfully')
      loadRecords()
    }
  }

  const filteredRecords = records.filter(record =>
    record.container_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.truck_license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.shipping_line?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-sm text-ink/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink mb-2">Evacuations Done</h1>
          <p className="text-sm text-ink/60">View and manage your completed evacuations</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by container number, license plate, or shipping line..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
            />
          </div>
        </div>

        {editingRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Edit Evacuation Record</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Container Number</label>
                  <input
                    type="text"
                    value={editFormData.container_number || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, container_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Container Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.container_weight || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, container_weight: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Usage/Status/Type</label>
                  <input
                    type="text"
                    value={editFormData.usage_status_type || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, usage_status_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Truck Driver Name</label>
                  <input
                    type="text"
                    value={editFormData.truck_driver_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, truck_driver_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Truck License Plate</label>
                  <input
                    type="text"
                    value={editFormData.truck_license_plate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, truck_license_plate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Shipping Line</label>
                  <select
                    value={editFormData.shipping_line || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, shipping_line: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
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
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-phelix-medium hover:bg-phelix-light text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping Line</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No evacuation records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.container_number}</div>
                      <div className="text-sm text-gray-500">{record.container_weight} kg</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.truck_driver_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.truck_license_plate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.shipping_line || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(record.processed_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReprocess(record)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reprocess"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
