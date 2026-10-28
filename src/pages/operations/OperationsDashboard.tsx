import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { Worker } from '../../types'
import { PageHeader, Card, Field, inputCls, Table } from '../../components/ui/Basics'

export default function OperationsDashboard() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ full_name: '', depot: 'graftons', position: '' })

  const workers = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workers').select('*').order('full_name')
      if (error) throw error
      return data as Worker[]
    }
  })

  const addWorker = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workers').insert({
        full_name: form.full_name,
        depot: form.depot,
        position: form.position || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] })
      setForm({ full_name: '', depot: 'graftons', position: '' })
    }
  })

  const rate = useMutation({
    mutationFn: async ({ id, star_rating }: { id: string; star_rating: number }) => {
      const { error } = await supabase.from('workers').update({ star_rating }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] })
  })

  return (
    <div>
      <PageHeader title="Operations" sub="Worker directory across Grafton's Container Depot and Hasting's Depot." />
      <div className="p-8 space-y-6">
        <Card>
          <h2 className="font-display text-lg mb-4">Add worker</h2>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              addWorker.mutate()
            }}
            className="grid grid-cols-4 gap-3 items-end"
          >
            <Field label="Full name">
              <input
                required
                className={inputCls}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
            <Field label="Position">
              <input
                className={inputCls}
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </Field>
            <button
              type="submit"
              disabled={addWorker.isPending}
              className="bg-depot text-white rounded px-4 py-2 text-sm font-medium h-[38px]"
            >
              {addWorker.isPending ? 'Saving…' : 'Add worker'}
            </button>
          </form>
        </Card>

        <Card>
          <Table head={['Name', 'Depot', 'Position', 'Status', 'Rating']}>
            {workers.data?.map((w) => (
              <tr key={w.id}>
                <td className="py-2 pr-4">{w.full_name}</td>
                <td className="py-2 pr-4">{w.depot === 'graftons' ? "Grafton's" : "Hasting's"}</td>
                <td className="py-2 pr-4 text-ink/60">{w.position}</td>
                <td className="py-2 pr-4 capitalize">{w.status.replace('_', ' ')}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => rate.mutate({ id: w.id, star_rating: n })}
                        className={n <= w.star_rating ? 'text-depot' : 'text-ink/15'}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}
