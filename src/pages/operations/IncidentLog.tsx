import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { Worker, WorkerIncident, WorkerPromotion } from '../../types'
import { PageHeader, Card, Field, inputCls, Table } from '../../components/ui/Basics'

export default function IncidentLog() {
  const qc = useQueryClient()
  const workers = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workers').select('*').order('full_name')
      if (error) throw error
      return data as Worker[]
    }
  })

  const incidents = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_incidents')
        .select('*')
        .order('incident_date', { ascending: false })
      if (error) throw error
      return data as WorkerIncident[]
    }
  })

  const promotions = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_promotions')
        .select('*')
        .order('decided_at', { ascending: false })
      if (error) throw error
      return data as WorkerPromotion[]
    }
  })

  const [incForm, setIncForm] = useState({ worker_id: '', description: '', severity: 'minor' })
  const addIncident = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('worker_incidents').insert({
        worker_id: incForm.worker_id,
        description: incForm.description,
        severity: incForm.severity
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
      setIncForm({ worker_id: '', description: '', severity: 'minor' })
    }
  })

  const [promForm, setPromForm] = useState({ worker_id: '', to_position: '', reason: '' })
  const addPromotion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('worker_promotions').insert({
        worker_id: promForm.worker_id,
        to_position: promForm.to_position,
        reason: promForm.reason || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] })
      setPromForm({ worker_id: '', to_position: '', reason: '' })
    }
  })

  function nameFor(id: string) {
    return workers.data?.find((w) => w.id === id)?.full_name ?? '—'
  }

  return (
    <div>
      <PageHeader title="Incidents & Promotions" sub="Track conduct patterns and recommend qualifying workers for promotion." />
      <div className="p-8 space-y-8">
        <section className="space-y-4">
          <Card>
            <h2 className="font-display text-lg mb-4">Log an incident</h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                addIncident.mutate()
              }}
              className="grid grid-cols-4 gap-3 items-end"
            >
              <Field label="Worker">
                <select
                  required
                  className={inputCls}
                  value={incForm.worker_id}
                  onChange={(e) => setIncForm({ ...incForm, worker_id: e.target.value })}
                >
                  <option value="">Select…</option>
                  {workers.data?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <input
                  required
                  className={inputCls}
                  value={incForm.description}
                  onChange={(e) => setIncForm({ ...incForm, description: e.target.value })}
                />
              </Field>
              <Field label="Severity">
                <select
                  className={inputCls}
                  value={incForm.severity}
                  onChange={(e) => setIncForm({ ...incForm, severity: e.target.value })}
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </Field>
              <button
                type="submit"
                disabled={addIncident.isPending}
                className="bg-depot text-white rounded px-4 py-2 text-sm font-medium h-[38px]"
              >
                Log incident
              </button>
            </form>
          </Card>
          <Card>
            <Table head={['Date', 'Worker', 'Description', 'Severity']}>
              {incidents.data?.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-4">{i.incident_date}</td>
                  <td className="py-2 pr-4">{nameFor(i.worker_id)}</td>
                  <td className="py-2 pr-4 text-ink/60">{i.description}</td>
                  <td className="py-2 pr-4 capitalize">{i.severity}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </section>

        <section className="space-y-4">
          <Card>
            <h2 className="font-display text-lg mb-4">Recommend a promotion</h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                addPromotion.mutate()
              }}
              className="grid grid-cols-4 gap-3 items-end"
            >
              <Field label="Worker">
                <select
                  required
                  className={inputCls}
                  value={promForm.worker_id}
                  onChange={(e) => setPromForm({ ...promForm, worker_id: e.target.value })}
                >
                  <option value="">Select…</option>
                  {workers.data?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="New position">
                <input
                  required
                  className={inputCls}
                  value={promForm.to_position}
                  onChange={(e) => setPromForm({ ...promForm, to_position: e.target.value })}
                />
              </Field>
              <Field label="Reason">
                <input
                  className={inputCls}
                  value={promForm.reason}
                  onChange={(e) => setPromForm({ ...promForm, reason: e.target.value })}
                />
              </Field>
              <button
                type="submit"
                disabled={addPromotion.isPending}
                className="bg-depot text-white rounded px-4 py-2 text-sm font-medium h-[38px]"
              >
                Record
              </button>
            </form>
          </Card>
          <Card>
            <Table head={['Date', 'Worker', 'New position', 'Reason']}>
              {promotions.data?.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4">{p.decided_at}</td>
                  <td className="py-2 pr-4">{nameFor(p.worker_id)}</td>
                  <td className="py-2 pr-4">{p.to_position}</td>
                  <td className="py-2 pr-4 text-ink/60">{p.reason}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </section>
      </div>
    </div>
  )
}
