import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useLiveTables } from '../../lib/realtime'
import { SHIPPING_LINES, type EvacuationRecord, type EvacuationNotification } from '../../types'
import { exportEvacuationsToExcel, type EvacuationExportData } from '../../lib/excelExport'
import { Download } from 'lucide-react'

interface Statistics {
  total_evacuations: number
  today_evacuations: number
  week_evacuations: number
  month_evacuations: number
  active_officers: number
  total_weight: number
  unique_containers: number
}

interface ActiveOfficer {
  officer_id: string
  officer_name: string
  officer_email: string
  today_evacuations: number
  total_evacuations: number
  last_evacuation_time: string | null
  last_seen_at: string
}

interface ShippingLineStats {
  shipping_line: string
  total_evacuations: number
  today_evacuations: number
  week_evacuations: number
  month_evacuations: number
  total_weight: number
  today_quota: number | null
  today_remaining: number | null
}

const LINE_LABEL = Object.fromEntries(SHIPPING_LINES.map((l) => [l.value, l.label])) as Record<string, string>

export default function EvacuationDashboard() {
  const [evacuations, setEvacuations] = useState<EvacuationRecord[]>([])
  const [notifications, setNotifications] = useState<EvacuationNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterOfficer, setFilterOfficer] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')

  // Get comprehensive statistics
  const statistics = useQuery({
    queryKey: ['evacuation_statistics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_evacuation_statistics')
      if (error) throw error
      return data as Statistics[]
    }
  })

  // Get active officers
  const activeOfficers = useQuery({
    queryKey: ['active_officers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_officers')
      if (error) throw error
      return data as ActiveOfficer[]
    },
    refetchInterval: 30_000
  })

  // Get shipping line statistics
  const shippingLineStats = useQuery({
    queryKey: ['shipping_line_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_evacuation_by_shipping_line')
      if (error) throw error
      return data as ShippingLineStats[]
    }
  })

  useLiveTables(
    ['evacuation_records', 'evacuation_quotas', 'profiles'],
    [['evacuation_statistics'], ['active_officers'], ['shipping_line_stats']]
  )

  const loadEvacuations = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('evacuation_records')
        .select(`
          *,
          profiles!evacuation_records_processed_by_fkey (
            full_name
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
  }, [filterOfficer, filterDate])

  const loadNotifications = useCallback(async () => {
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
  }, [])

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

  useEffect(() => {
    loadEvacuations()
    loadNotifications()

    // Set up real-time subscription for new evacuations
    const subscription = supabase
      .channel('evacuation_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'evacuation_records' }, (payload) => {
        console.log('New evacuation record received:', payload.new)
        setEvacuations(prev => [payload.new as EvacuationRecord, ...prev])
        loadNotifications()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'evacuation_records' }, (payload) => {
        console.log('Evacuation record updated:', payload.new)
        setEvacuations(prev =>
          prev.map(record => record.id === payload.new.id ? payload.new as EvacuationRecord : record)
        )
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to evacuation changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to evacuation changes')
        }
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadEvacuations, loadNotifications])

  // Reload evacuations when filters change
  useEffect(() => {
    loadEvacuations()
  }, [filterOfficer, filterDate, loadEvacuations])

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

  // Export to Excel function
  function handleExportToExcel() {
    const exportData: EvacuationExportData[] = evacuations.map((record) => ({
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
      condition_statement: record.condition_statement,
      officer_name: (record as any).profiles?.full_name || 'Unknown',
      officer_email: (record as any).profiles?.email || 'N/A',
      processed_at: record.processed_at,
      payment_status: (record as any).payment_status || null,
      payment_date: (record as any).payment_date || null,
      payment_notes: (record as any).payment_notes || null,
    }))

    exportEvacuationsToExcel(exportData, 'evacuation_records')
  }

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
              onClick={handleExportToExcel}
              disabled={evacuations.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </button>
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
            <p className="text-2xl font-semibold text-ink">
              {statistics.data?.[0]?.total_evacuations || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Today</p>
            <p className="text-2xl font-semibold text-ink">
              {statistics.data?.[0]?.today_evacuations || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">This Week</p>
            <p className="text-2xl font-semibold text-ink">
              {statistics.data?.[0]?.week_evacuations || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Active Officers (online now)</p>
            <p className="text-2xl font-semibold text-ink">
              {statistics.data?.[0]?.active_officers || 0}
            </p>
          </div>
        </div>

        {/* Additional Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">This Month</p>
            <p className="text-2xl font-semibold text-ink">
              {statistics.data?.[0]?.month_evacuations || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Total Weight of Containers Processed</p>
            <p className="text-2xl font-semibold text-ink">
              {Number(statistics.data?.[0]?.total_weight || 0).toLocaleString()} kg
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-ink/60">Unique Containers</p>
            <p className="text-2xl font-semibold text-ink">
              {statistics.data?.[0]?.unique_containers || 0}
            </p>
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

        {/* Active Officers Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-ink mb-1">Currently Active Evacuation Officers</h3>
          <p className="text-xs text-ink/50 mb-4">Officers signed in to the system within the last 3 minutes</p>
          {activeOfficers.isLoading ? (
            <div className="text-center text-sm text-ink/60">Loading active officers...</div>
          ) : activeOfficers.data && activeOfficers.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOfficers.data.map((officer) => (
                <div key={officer.officer_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-ink">{officer.officer_name}</p>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                  </div>
                  <p className="text-sm text-ink/60 mb-2">{officer.officer_email}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink/80">Today: <strong>{officer.today_evacuations}</strong></span>
                    <span className="text-ink/80">Total: <strong>{officer.total_evacuations}</strong></span>
                  </div>
                  <p className="text-xs text-ink/40 mt-2">
                    Last evacuation:{' '}
                    {officer.last_evacuation_time ? new Date(officer.last_evacuation_time).toLocaleString() : 'none yet'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-ink/60">No evacuation officers are signed in right now</div>
          )}
        </div>

        {/* Shipping Line Statistics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Evacuations by Shipping Line</h3>
          {shippingLineStats.isLoading ? (
            <div className="text-center text-sm text-ink/60">Loading shipping line statistics...</div>
          ) : shippingLineStats.error ? (
            <div className="text-center text-sm text-red-600">{(shippingLineStats.error as Error).message}</div>
          ) : shippingLineStats.data && shippingLineStats.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Shipping Line</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Evacuations Done</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Today</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">This Week</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">This Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Today's Quota</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Remaining Today</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shippingLineStats.data.map((stat) => (
                    <tr key={stat.shipping_line} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-ink">{LINE_LABEL[stat.shipping_line] ?? stat.shipping_line}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{stat.total_evacuations}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{stat.today_evacuations}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{stat.week_evacuations}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{stat.month_evacuations}</td>
                      <td className="px-4 py-3 text-sm text-ink/80">{stat.today_quota ?? 'Not set'}</td>
                      <td className="px-4 py-3 text-sm">
                        {stat.today_remaining === null ? (
                          <span className="text-ink/40">—</span>
                        ) : (
                          <span className={stat.today_remaining > 0 ? 'text-green-600' : 'text-red-600'}>
                            {stat.today_remaining}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-sm text-ink/60">No shipping line data available</div>
          )}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/60 uppercase">Barcode</th>
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
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {record.container_number}
                        {(record.container_type || record.container_size) && (
                          <span className="block text-xs text-ink/50">
                            {[record.container_type, record.container_size].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ink/70">{record.barcode_number || '—'}</td>
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
