import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { EvacuationQuota, EvacuationTracking } from '../../types'
import { Save, RefreshCw } from 'lucide-react'

export default function EvacuationQuota() {
  const queryClient = useQueryClient()
  const [quotas, setQuotas] = useState<Record<string, number>>({})

  const { data: quotaData, isLoading: quotasLoading } = useQuery({
    queryKey: ['evacuation_quotas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('evacuation_quotas').select('*')
      if (error) throw error
      return data as EvacuationQuota[]
    }
  })

  const { data: trackingData, isLoading: trackingLoading } = useQuery({
    queryKey: ['evacuation_tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evacuation_tracking')
        .select('*')
        .order('record_date', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as EvacuationTracking[]
    }
  })

  useEffect(() => {
    if (quotaData) {
      const initialQuotas: Record<string, number> = {}
      quotaData.forEach(q => {
        initialQuotas[q.shipping_line] = q.total_evacuations
      })
      setQuotas(initialQuotas)
    }
  }, [quotaData])

  const updateQuotaMutation = useMutation({
    mutationFn: async (shippingLine: string) => {
      const quota = quotaData?.find(q => q.shipping_line === shippingLine)
      if (!quota) throw new Error('Quota not found')

      const { error } = await supabase
        .from('evacuation_quotas')
        .update({
          total_evacuations: quotas[shippingLine],
          updated_at: new Date().toISOString()
        })
        .eq('id', quota.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evacuation_quotas'] })
    }
  })

  const resetQuotasMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('evacuation_quotas')
        .update({
          current_evacuations: 0,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evacuation_quotas'] })
    }
  })

  function handleQuotaChange(shippingLine: string, value: string) {
    setQuotas(prev => ({
      ...prev,
      [shippingLine]: parseInt(value) || 0
    }))
  }

  function handleSaveQuota(shippingLine: string) {
    updateQuotaMutation.mutate(shippingLine)
  }

  function handleResetQuotas() {
    if (confirm('Are you sure you want to reset all current evacuation counts to 0?')) {
      resetQuotasMutation.mutate()
    }
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const officers = trackingData ? [...new Set(trackingData.map(t => t.officer_name))] : []

  function getTrackingData(day: string, officer: string) {
    if (!trackingData) return null
    return trackingData.filter(t => t.day_of_week === day && t.officer_name === officer)
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
          <p className="text-sm text-ink/60">Set evacuation quotas and track officer activity</p>
        </div>

        {/* Quota Management Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-ink">Evacuation Quotas</h3>
            <button
              onClick={handleResetQuotas}
              disabled={resetQuotasMutation.isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${resetQuotasMutation.isPending ? 'animate-spin' : ''}`} />
              Reset Current Counts
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {quotaData?.map((quota) => (
              <div key={quota.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-ink mb-3">{quota.shipping_line}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Total Evacuations</label>
                    <input
                      type="number"
                      min="0"
                      value={quotas[quota.shipping_line] || quota.total_evacuations}
                      onChange={(e) => handleQuotaChange(quota.shipping_line, e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-phelix-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Current Evacuations</label>
                    <div className="text-lg font-semibold text-phelix-medium">{quota.current_evacuations}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Remaining</label>
                    <div className="text-lg font-semibold text-green-600">
                      {quota.total_evacuations - quota.current_evacuations}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveQuota(quota.shipping_line)}
                    disabled={updateQuotaMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-phelix-medium hover:bg-phelix-light text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-ink mb-6">Evacuation Activity Tracking</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                  {officers.map(officer => (
                    <th key={officer} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {officer}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {daysOfWeek.map(day => (
                  <tr key={day}>
                    <td className="px-4 py-3 font-medium text-ink">{day}</td>
                    {officers.map(officer => {
                      const records = getTrackingData(day, officer)
                      return (
                        <td key={`${day}-${officer}`} className="px-4 py-3">
                          {records && records.length > 0 ? (
                            <div className="space-y-1">
                              {records.map((record, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium">{record.shipping_line}:</span>{' '}
                                  <span className="text-gray-600">{record.amount_done}</span>
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
