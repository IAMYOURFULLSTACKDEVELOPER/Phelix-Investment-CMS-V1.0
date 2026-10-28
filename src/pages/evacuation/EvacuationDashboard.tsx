import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { EvacuationRecord, EvacuationNotification } from '../../types'

export default function EvacuationDashboard() {
  const [evacuations, setEvacuations] = useState<EvacuationRecord[]>([])
  const [notifications, setNotifications] = useState<EvacuationNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<EvacuationRecord | null>(null)
  const [filterOfficer, setFilterOfficer] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')

  useEffect(() => {
    loadEvacuations()
    loadNotifications()
    
    // Set up real-time subscription for new evacuations
    const subscription = supabase
      .channel('evacuation_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'evacuation_records' }, (payload) => {
        setEvacuations(prev => [payload.new as EvacuationRecord, ...prev])
        loadNotifications()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadEvacuations() {
    setLoading(true)
    try {
      let query = supabase
        .from('evacuation_records')
        .select(`
          *,
          profiles!evacuation_records_processed_by_fkey (
            full_name,
            email
          )
        `)
        .order('processed_at', { ascending: false })

      if (filterOfficer !== 'all') {
        query = query.eq('processed_by', filterOfficer)
      }

      if (filterDate) {
        query = query.gte('delivered_at', filterDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading evacuations:', error)
        return
      }

      setEvacuations(data as EvacuationRecord[])
    } catch (err) {
      console.error('Load evacuations error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from('evacuation_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading notifications:', error)
        return
      }

      setNotifications(data as EvacuationNotification[])
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch (err) {
      console.error('Load notifications error:', err)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('evacuation_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Mark as read error:', err)
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase
        .from('evacuation_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all as read:', error)
        return
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Mark all as read error:', err)
    }
  }

  function handlePrint(record: EvacuationRecord) {
    const printContent = window.open('', '_blank')
    if (printContent) {
      printContent.document.write(`
        <html>
          <head>
            <title>Evacuation Document - ${record.container_number}</title>
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
              <p>Generated: ${new Date(record.processed_at).toLocaleString()}</p>
            </div>
            
            <div class="section">
              <p><span class="label">Container Number:</span><span class="value">${record.container_number}</span></p>
              <p><span class="label">Container Weight:</span><span class="value">${record.container_weight} kg</span></p>
              <p><span class="label">Usage/Status/Type:</span><span class="value">${record.usage_status_type}</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Truck Driver Name:</span><span class="value">${record.truck_driver_name}</span></p>
              <p><span class="label">Truck License Plate:</span><span class="value">${record.truck_license_plate}</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Delivered At:</span><span class="value">${new Date(record.delivered_at).toLocaleDateString()}</span></p>
              <p><span class="label">Gate Out Time:</span><span class="value">${record.gate_out_time ? new Date(record.gate_out_time).toLocaleString() : 'N/A'}</span></p>
            </div>
            
            <div class="section">
              <p><span class="label">Shipping Line:</span><span class="value">${record.shipping_line || 'N/A'}</span></p>
              <p><span class="label">Export Receipt Number:</span><span class="value">${record.export_receipt_number || 'N/A'}</span></p>
              <p><span class="label">Booking Number:</span><span class="value">${record.booking_number || 'N/A'}</span></p>
              <p><span class="label">Barcode Number:</span><span class="value">${record.barcode_number || 'N/A'}</span></p>
            </div>
            
            ${record.remarks ? `
            <div class="section">
              <p><span class="label">Remarks:</span><span class="value">${record.remarks}</span></p>
            </div>
            ` : ''}
            
            <div class="signatures">
              <div class="signature-box">
                <p>Terminal Clerk</p>
                <p>${record.terminal_clerk_name || 'N/A'}</p>
                <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                <p>Clerk</p>
                <p>${record.clerk_name || 'N/A'}</p>
                <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                <p>Truck Driver</p>
                <p>${record.truck_driver_name}</p>
                <div class="signature-line"></div>
              </div>
            </div>
            
            <div class="condition">
              <p>${record.condition_statement}</p>
            </div>
            
            <div class="section" style="margin-top: 30px;">
              <p><span class="label">Customs:</span><span class="value">${record.customs_signature || 'N/A'}</span></p>
            </div>
          </body>
        </html>
      `)
      printContent.document.close()
      printContent.print()
    }
  }

  function handleDownloadPDF(record: EvacuationRecord) {
    handlePrint(record)
  }

  function handleDownloadWord(record: EvacuationRecord) {
    const rtfContent = `
      {\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
      \\f0\\fs24
      \\b\\fs32 PHELIX INVESTMENT\\b0\\par
      \\b\\fs28 Evacuation Document\\b0\\par
      \\par
      Container Number: ${record.container_number}\\par
      Container Weight: ${record.container_weight} kg\\par
      Usage/Status/Type: ${record.usage_status_type}\\par
      \\par
      Truck Driver Name: ${record.truck_driver_name}\\par
      Truck License Plate: ${record.truck_license_plate}\\par
      \\par
      Delivered At: ${new Date(record.delivered_at).toLocaleDateString()}\\par
      Gate Out Time: ${record.gate_out_time ? new Date(record.gate_out_time).toLocaleString() : 'N/A'}\\par
      \\par
      Shipping Line: ${record.shipping_line || 'N/A'}\\par
      Export Receipt Number: ${record.export_receipt_number || 'N/A'}\\par
      Booking Number: ${record.booking_number || 'N/A'}\\par
      Barcode Number: ${record.barcode_number || 'N/A'}\\par
      ${record.remarks ? `Remarks: ${record.remarks}\\par` : ''}
      \\par
      Terminal Clerk: ${record.terminal_clerk_name || 'N/A'}\\par
      Clerk: ${record.clerk_name || 'N/A'}\\par
      Truck Driver: ${record.truck_driver_name}\\par
      Customs: ${record.customs_signature || 'N/A'}\\par
      \\par
      \\i${record.condition_statement}\\i0\\par
      }
    `
    
    const blob = new Blob([rtfContent], { type: 'application/rtf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evacuation_${record.container_number}.rtf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get unique officers for filter
  const officers = Array.from(new Set(evacuations.map(e => e.processed_by)))
  const officerRecords = evacuations.reduce((acc, record) => {
    if (!acc[record.processed_by]) {
      acc[record.processed_by] = {
        name: (record as any).profiles?.full_name || 'Unknown',
        count: 0
      }
    }
    acc[record.processed_by].count++
    return acc
  }, {} as Record<string, { name: string; count: number }>)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-ink mb-2">Evacuation Operations</h1>
            <p className="text-sm text-ink/60">Monitor all evacuation operations across the system</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Mark All as Read ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Recent Notifications</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg ${notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <p className={`text-sm ${notification.is_read ? 'text-ink/60' : 'text-ink'}`}>
                      {notification.message}
                    </p>
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-ink/40 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Total Evacuations</p>
            <p className="text-2xl font-semibold text-ink">{evacuations.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Today</p>
            <p className="text-2xl font-semibold text-ink">
              {evacuations.filter(e => 
                new Date(e.delivered_at).toDateString() === new Date().toDateString()
              ).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">This Week</p>
            <p className="text-2xl font-semibold text-ink">
              {evacuations.filter(e => {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return new Date(e.delivered_at) >= weekAgo
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Active Officers</p>
            <p className="text-2xl font-semibold text-ink">{Object.keys(officerRecords).length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-2">Filter by Officer</label>
              <select
                value={filterOfficer}
                onChange={(e) => {
                  setFilterOfficer(e.target.value)
                  loadEvacuations()
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
              >
                <option value="all">All Officers</option>
                {Object.entries(officerRecords).map(([id, { name, count }]) => (
                  <option key={id} value={id}>
                    {name} ({count} evacuations)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink block mb-2">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value)
                  loadEvacuations()
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
              />
            </div>
          </div>
        </div>

        {/* Evacuations Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-ink/60">Loading...</div>
          ) : evacuations.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink/60">No evacuation records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Container</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Driver</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Plate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Weight</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Shipping Line</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Officer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {evacuations.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-ink">{record.container_number}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{record.truck_driver_name}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{record.truck_license_plate}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{record.container_weight} kg</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{record.shipping_line || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">
                        {(record as any).profiles?.full_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink/80">
                        {new Date(record.delivered_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePrint(record)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Print
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(record)}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadWord(record)}
                            className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                          >
                            Word
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
