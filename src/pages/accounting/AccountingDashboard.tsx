import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useLiveTables } from '../../lib/realtime'
import type { AccountingEntry } from '../../types'
import { PageHeader, Card, Field, inputCls, Table, Stat } from '../../components/ui/Basics'

export default function AccountingDashboard() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'expense', category: '', amount: '', description: '' })

  const entries = useQuery({
    queryKey: ['accounting_entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*, profiles!accounting_entries_created_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as (AccountingEntry & { profiles: { full_name: string } | null })[]
    }
  })

  useLiveTables(['accounting_entries'], [['accounting_entries'], ['admin_summary'], ['admin_recent_accounting']])

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('accounting_entries').insert({
        entry_date: new Date().toISOString().slice(0, 10),
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: form.description || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting_entries'] })
      qc.invalidateQueries({ queryKey: ['admin_summary'] })
      setForm({ type: 'expense', category: '', amount: '', description: '' })
    }
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    addEntry.mutate()
  }

  const revenue = entries.data?.filter((e) => e.type === 'revenue').reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const expense = entries.data?.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0) ?? 0

  return (
    <div>
      <PageHeader title="Accounting" sub="Daily entries roll up into monthly and yearly totals automatically." />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Revenue (recent)" value={`Le ${revenue.toLocaleString()}`} accent="#2F5D50" />
          <Stat label="Expenses (recent)" value={`Le ${expense.toLocaleString()}`} accent="#B8542B" />
          <Stat label="Net" value={`Le ${(revenue - expense).toLocaleString()}`} />
        </div>

        <Card>
          <h2 className="font-display text-lg mb-4">Log an entry</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-3 items-end">
            <Field label="Type">
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="revenue">Revenue</option>
              </select>
            </Field>
            <Field label="Category">
              <input
                className={inputCls}
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Fuel, Wages"
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
            <button
              type="submit"
              disabled={addEntry.isPending}
              className="bg-ledger text-white rounded px-4 py-2 text-sm font-medium h-[38px]"
            >
              {addEntry.isPending ? 'Saving…' : 'Add entry'}
            </button>
            <Field label="Description (optional)">
              <input
                className={inputCls}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes"
              />
            </Field>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-lg mb-4">Recent entries</h2>
          {addEntry.isError && (
            <p className="text-xs text-red-600 mb-3">{(addEntry.error as Error).message}</p>
          )}
          <Table head={['Date', 'Type', 'Category', 'Amount', 'Description', 'Logged by']}>
            {entries.data?.map((e) => (
              <tr key={e.id}>
                <td className="py-2 pr-4">{e.entry_date}</td>
                <td className="py-2 pr-4 capitalize">{e.type}</td>
                <td className="py-2 pr-4">{e.category}</td>
                <td className="py-2 pr-4">Le {Number(e.amount).toLocaleString()}</td>
                <td className="py-2 pr-4 text-ink/60">{e.description}</td>
                <td className="py-2 pr-4 text-ink/60">{e.profiles?.full_name ?? '—'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}
