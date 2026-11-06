import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useLiveTables } from '../../lib/realtime'
import { SHIPPING_LINES, type EvacuationQuota as Quota, type EvacuationTracking } from '../../types'
import { Save } from 'lucide-react'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EvacuationQuota() {
  const queryClient = useQueryClient()
  const [quotaDate, setQuotaDate] = useState(today())
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const { data: quotaData, isLoading: quotasLoading } = useQuery({
    queryKey: ['evacuation_quotas', quotaDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('evacuation_quotas').select('*').eq('quota_date', quotaDate)
      if (error) throw error
      return data as Quota[]
    }
  })

  const { data: trackingData, isLoading: trackingLoading } = useQuery({
    queryKey: ['evacuation_tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evacuation_tracking')
        .select('*')
        .order('record_date', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as EvacuationTracking[]
    }
  })

  useLiveTables(['evacuation_quotas', 'evacuation_records'], [['evacuation_quotas'], ['evacuation_tracking']])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const line of SHIPPING_LINES) {
      const q = quotaData?.find((x) => x.shipping_line === line.value)
      next[line.value] = q ? String(q.total_evacuations) : ''
    }
    setInputs(next)
  }, [quotaData])

  const saveQuota = useMutation({
    mutationFn: async (shippingLine: string) => {
      const total = Number(inputs[shippingLine])
      if (inputs[shippingLine] === '' || !Number.isInteger(total) || total < 0) {
        throw new Error('Enter a whole number of evacuations (0 or more).')
      }
      const { error } = await supabase.rpc('set_evacuation_quota', {
        p_shipping_line: shippingLine,
        p_total: total,
        p_date: quotaDate
      })
      if (error) throw error
      return shippingLine
    },
    onSuccess: (line) => {
      setMessage({ type: 'ok', text: `Quota saved for ${line} on ${quotaDate}.` })
      queryClient.invalidateQueries({ queryKey: ['evacuation_quotas'] })
    },
    onError: (e: Error) => setMessage({ type: 'error', text: e.message })
  })

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const officers = trackingData ? [...new Set(trackingData.map((t) => t.officer_name))] : []

  function getTrackingTotals(day: string, officer: string) {
    const totals: Record<string, number> = {}
    for (const t of trackingData ?? []) {
      if (t.day_of_week === day && t.officer_name === officer) {
        totals[t.shipping_line] = (totals[t.shipping_line] ?? 0) + t.amount_done
      }
    }
    return Object.entries(totals)
  }

  if (quotasLoading || trackingLoading) {
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
          <h1 className="text-2xl font-semibold text-ink mb-2">Evacuation Quota Management</h1>
          <p className="text-sm text-ink/60">
            Set how many evacuations may be processed per shipping line for a day. Each processed evacuation is deducted
            automatically; officers are blocked from that shipping line once its quota is used up, until you raise it.
            Shipping lines without a quota for the day are not limited.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
            <h3 className="text-lg font-semibold text-ink">Daily Evacuation Quotas</h3>
            <label className="text-sm text-ink/70">
              <span className="block text-xs text-gray-500 mb-1">Quota date</span>
              <input
                type="date"
                value={quotaDate}
                onChange={(e) => {
                  setQuotaDate(e.target.value || today())
                  setMessage(null)
                }}
                className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
              />
            </label>
          </div>

          {message && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm ${
                message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {SHIPPING_LINES.map((line) => {
              const quota = quotaData?.find((q) => q.shipping_line === line.value)
              const used = quota?.current_evacuations ?? 0
              const remaining = quota ? Math.max(quota.total_evacuations - used, 0) : null
              const full = quota !== undefined && remaining === 0
              return (
                <div key={line.value} className={`border rounded-lg p-4 ${full ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}`}>
                  <h4 className="font-medium text-ink mb-3">{line.label}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Evacuations allowed</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="No limit"
                        value={inputs[line.value] ?? ''}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [line.value]: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Processed</label>
                      <div className="text-lg font-semibold text-phelix-medium">{used}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Remaining</label>
                      <div className={`text-lg font-semibold ${full ? 'text-red-600' : 'text-green-600'}`}>
                        {remaining === null ? 'No limit' : remaining}
                      </div>
                      {full && <p className="text-xs text-red-600 mt-1">Quota reached — officers are blocked</p>}
                    </div>
                    <button
                      onClick={() => saveQuota.mutate(line.value)}
                      disabled={saveQuota.isPending}
                      className="w-full flex items-center justify-center gap-2 bg-phelix-medium hover:bg-phelix-light text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-ink mb-6">Evacuation Activity Tracking</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                  {officers.map((officer) => (
                    <th key={officer} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {officer}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {daysOfWeek.map((day) => (
                  <tr key={day}>
                    <td className="px-4 py-3 font-medium text-ink">{day}</td>
                    {officers.map((officer) => {
                      const totals = getTrackingTotals(day, officer)
                      return (
                        <td key={`${day}-${officer}`} className="px-4 py-3">
                          {totals.length > 0 ? (
                            <div className="space-y-1">
                              {totals.map(([line, amount]) => (
                                <div key={line} className="text-xs">
                                  <span className="font-medium">{line}:</span> <span className="text-gray-600">{amount}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
