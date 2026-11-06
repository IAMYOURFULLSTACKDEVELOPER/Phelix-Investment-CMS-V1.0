import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useLiveTables } from '../../lib/realtime'
import { downloadFuelReportDocx } from '../../lib/fuelReport'
import { FileDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { FuelLog } from '../../types'
import { PageHeader, Card, Field, inputCls, Table } from '../../components/ui/Basics'

export default function FuelDashboard() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({ received_by: '', depot: 'graftons', quantity_liters: '' })
  const [dispenserPhoto, setDispenserPhoto] = useState<File | null>(null)
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = profile?.role === 'super_admin'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const logs = useQuery({
    queryKey: ['fuel_logs', isAdmin, fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from('fuel_logs')
        .select('*, profiles!fuel_logs_issued_by_fkey(full_name)')
        .order('dispensed_at', { ascending: false })
      if (fromDate) query = query.gte('dispensed_at', `${fromDate}T00:00:00`)
      if (toDate) query = query.lte('dispensed_at', `${toDate}T23:59:59.999`)
      if (!isAdmin) query = query.limit(20)
      const { data, error } = await query
      if (error) throw error
      return data as (FuelLog & { profiles: { full_name: string } | null })[]
    }
  })

  useLiveTables(['fuel_logs'], [['fuel_logs'], ['admin_summary']])

  async function openEvidence(path: string) {
    const { data, error } = await supabase.storage.from('fuel-evidence').createSignedUrl(path, 300)
    if (error) {
      setError(error.message)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleExportDocx() {
    if (!logs.data) return
    setExporting(true)
    try {
      const period =
        fromDate || toDate ? `${fromDate || 'beginning'} to ${toDate || 'today'}` : 'All fuel logs'
      await downloadFuelReportDocx(
        logs.data.map((l) => ({
          dispensed_at: l.dispensed_at,
          issued_by_name: l.profiles?.full_name ?? 'Unknown',
          received_by: l.received_by,
          depot: l.depot,
          quantity_liters: l.quantity_liters
        })),
        period
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export the report')
    } finally {
      setExporting(false)
    }
  }

  const addLog = useMutation({
    mutationFn: async () => {
      if (!dispenserPhoto || !receiptPhoto) {
        throw new Error('Both the dispenser photo and the receipt photo are required.')
      }
      const stamp = Date.now()
      const dispenserPath = `${profile!.id}/${stamp}-dispenser-${dispenserPhoto.name}`
      const receiptPath = `${profile!.id}/${stamp}-receipt-${receiptPhoto.name}`

      const up1 = await supabase.storage.from('fuel-evidence').upload(dispenserPath, dispenserPhoto)
      if (up1.error) throw up1.error
      const up2 = await supabase.storage.from('fuel-evidence').upload(receiptPath, receiptPhoto)
      if (up2.error) throw up2.error

      const { error } = await supabase.from('fuel_logs').insert({
        received_by: form.received_by,
        depot: form.depot,
        quantity_liters: Number(form.quantity_liters),
        dispenser_photo_path: dispenserPath,
        receipt_photo_path: receiptPath
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel_logs'] })
      qc.invalidateQueries({ queryKey: ['admin_summary'] })
      setForm({ received_by: '', depot: 'graftons', quantity_liters: '' })
      setDispenserPhoto(null)
      setReceiptPhoto(null)
      setError(null)
    },
    onError: (e: Error) => setError(e.message)
  })

  return (
    <div>
      <PageHeader
        title="Fuel Monitoring"
        sub="Every dispensing event requires a photo of the dispenser and the receipt, both stored in access-controlled Supabase Storage."
      />
      <div className="p-8 space-y-6">
        {!isAdmin && (
        <Card>
          <h2 className="font-display text-lg mb-4">Log fuel issued</h2>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              addLog.mutate()
            }}
            className="grid grid-cols-2 gap-4"
          >
            <Field label="Received by">
              <input
                required
                className={inputCls}
                value={form.received_by}
                onChange={(e) => setForm({ ...form, received_by: e.target.value })}
              />
            </Field>
            <Field label="Depot">
              <select
                className={inputCls}
                value={form.depot}
                onChange={(e) => setForm({ ...form, depot: e.target.value })}
              >
                <option value="graftons">Grafton's Container Depot</option>
                <option value="hastings">Hasting's Depot</option>
              </select>
            </Field>
            <Field label="Quantity (litres)">
              <input
                type="number"
                min="0"
                step="0.1"
                required
                className={inputCls}
                value={form.quantity_liters}
                onChange={(e) => setForm({ ...form, quantity_liters: e.target.value })}
              />
            </Field>
            <div />
            <Field label="Photo of dispenser (required)">
              <input
                type="file"
                accept="image/*"
                required
                className={inputCls}
                onChange={(e) => setDispenserPhoto(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Photo of receipt (required)">
              <input
                type="file"
                accept="image/*"
                required
                className={inputCls}
                onChange={(e) => setReceiptPhoto(e.target.files?.[0] ?? null)}
              />
            </Field>
            {error && <p className="text-xs text-red-600 col-span-2">{error}</p>}
            <button
              type="submit"
              disabled={addLog.isPending}
              className="bg-fuel text-white rounded px-4 py-2 text-sm font-medium col-span-2"
            >
              {addLog.isPending ? 'Uploading…' : 'Submit log'}
            </button>
          </form>
        </Card>
        )}

        <Card>
          {isAdmin && (
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-lg">Fuel logs from all attendants</h2>
                <p className="text-xs text-ink/50">
                  {logs.data?.length ?? 0} logs •{' '}
                  {(logs.data?.reduce((s, l) => s + Number(l.quantity_liters), 0) ?? 0).toLocaleString()} L total
                </p>
              </div>
              <div className="flex items-end gap-3">
                <Field label="From">
                  <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </Field>
                <Field label="To">
                  <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </Field>
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={exporting || !logs.data?.length}
                  className="flex items-center gap-2 bg-fuel text-white rounded px-4 py-2 text-sm font-medium h-[38px] disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  {exporting ? 'Exporting…' : 'Export report (.docx)'}
                </button>
              </div>
            </div>
          )}
          {isAdmin && error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <Table head={['Dispensed', 'Issued by', 'Received by', 'Depot', 'Litres', 'Evidence']}>
            {logs.data?.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-4">{new Date(l.dispensed_at).toLocaleString()}</td>
                <td className="py-2 pr-4">{l.profiles?.full_name ?? '—'}</td>
                <td className="py-2 pr-4">{l.received_by}</td>
                <td className="py-2 pr-4">{l.depot === 'graftons' ? "Grafton's" : "Hasting's"}</td>
                <td className="py-2 pr-4">{l.quantity_liters} L</td>
                <td className="py-2 pr-4 text-xs space-x-3">
                  <button type="button" className="text-fuel hover:underline" onClick={() => openEvidence(l.dispenser_photo_path)}>
                    Dispenser
                  </button>
                  <button type="button" className="text-fuel hover:underline" onClick={() => openEvidence(l.receipt_photo_path)}>
                    Receipt
                  </button>
                </td>
              </tr>
            ))}
          </Table>
          {logs.data && logs.data.length === 0 && <p className="text-sm text-ink/60 mt-3">No fuel logs yet.</p>}
        </Card>
      </div>
    </div>
  )
}
