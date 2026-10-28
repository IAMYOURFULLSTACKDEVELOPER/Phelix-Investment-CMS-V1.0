import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
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

  const logs = useQuery({
    queryKey: ['fuel_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_logs')
        .select('*')
        .order('dispensed_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as FuelLog[]
    }
  })

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

        <Card>
          <Table head={['Dispensed', 'Received by', 'Depot', 'Litres', 'Evidence']}>
            {logs.data?.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-4">{new Date(l.dispensed_at).toLocaleString()}</td>
                <td className="py-2 pr-4">{l.received_by}</td>
                <td className="py-2 pr-4">{l.depot === 'graftons' ? "Grafton's" : "Hasting's"}</td>
                <td className="py-2 pr-4">{l.quantity_liters} L</td>
                <td className="py-2 pr-4 text-ink/60 text-xs">dispenser + receipt on file</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}
