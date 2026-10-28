import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { PaymentMade } from '../../types'
import { PageHeader, Card, Field, inputCls, Table } from '../../components/ui/Basics'

export default function PaymentsMade() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ paid_to: '', amount: '', purpose: '', related_sector: 'general' })

  const payments = useQuery({
    queryKey: ['payments_made'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments_made')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as PaymentMade[]
    }
  })

  const addPayment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('payments_made').insert({
        paid_to: form.paid_to,
        amount: Number(form.amount),
        purpose: form.purpose,
        related_sector: form.related_sector,
        payment_date: new Date().toISOString().slice(0, 10)
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments_made'] })
      setForm({ paid_to: '', amount: '', purpose: '', related_sector: 'general' })
    }
  })

  return (
    <div>
      <PageHeader
        title="Payments Made"
        sub={`Paid to any individual or party — e.g. "Paid EVAC a certain amount for a driver trip". Tagging a payment as EVAC only creates a summary reference; the underlying EVAC record stays in the separate EVAC system.`}
      />
      <div className="p-8 space-y-6">
        <Card>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              addPayment.mutate()
            }}
            className="grid grid-cols-5 gap-3 items-end"
          >
            <Field label="Paid to">
              <input
                required
                className={inputCls}
                value={form.paid_to}
                onChange={(e) => setForm({ ...form, paid_to: e.target.value })}
              />
            </Field>
            <Field label="Amount (Le)">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className={inputCls}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <Field label="Purpose">
              <input
                required
                className={inputCls}
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="What was this for?"
              />
            </Field>
            <Field label="Related sector">
              <select
                className={inputCls}
                value={form.related_sector}
                onChange={(e) => setForm({ ...form, related_sector: e.target.value })}
              >
                <option value="general">General</option>
                <option value="evac">EVAC</option>
                <option value="operations">Operations</option>
                <option value="fuel">Fuel</option>
              </select>
            </Field>
            <button
              type="submit"
              disabled={addPayment.isPending}
              className="bg-ledger text-white rounded px-4 py-2 text-sm font-medium h-[38px]"
            >
              {addPayment.isPending ? 'Saving…' : 'Record payment'}
            </button>
          </form>
        </Card>

        <Card>
          <Table head={['Date', 'Paid to', 'Amount', 'Purpose', 'Sector']}>
            {payments.data?.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-4">{p.payment_date}</td>
                <td className="py-2 pr-4">{p.paid_to}</td>
                <td className="py-2 pr-4">Le {p.amount.toLocaleString()}</td>
                <td className="py-2 pr-4 text-ink/60">{p.purpose}</td>
                <td className="py-2 pr-4">
                  {p.related_sector === 'evac' ? (
                    <span className="text-xs bg-ink/5 rounded px-2 py-0.5">EVAC</span>
                  ) : (
                    p.related_sector
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}
