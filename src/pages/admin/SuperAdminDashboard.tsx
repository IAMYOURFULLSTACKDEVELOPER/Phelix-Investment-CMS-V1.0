import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { PageHeader, Card, Stat } from '../../components/ui/Basics'

export default function SuperAdminDashboard() {
  const summary = useQuery({
    queryKey: ['admin_summary'],
    queryFn: async () => {
      const [entries, workers, fuel] = await Promise.all([
        supabase.from('accounting_entries').select('type, amount'),
        supabase.from('workers').select('id, status'),
        supabase.from('fuel_logs').select('id, quantity_liters')
      ])
      const revenue = entries.data?.filter((e) => e.type === 'revenue').reduce((s, e) => s + e.amount, 0) ?? 0
      const expense = entries.data?.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0) ?? 0
      const activeWorkers = workers.data?.filter((w) => w.status === 'active').length ?? 0
      const litres = fuel.data?.reduce((s, f) => s + f.quantity_liters, 0) ?? 0
      return { revenue, expense, activeWorkers, litres }
    }
  })

  return (
    <div>
      <PageHeader title="Super Admin Overview" sub="Full visibility across every sector — Mr Phelix's dashboard." />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Total revenue" value={`Le ${(summary.data?.revenue ?? 0).toLocaleString()}`} accent="#8A5A2B" />
          <Stat label="Total expenses" value={`Le ${(summary.data?.expense ?? 0).toLocaleString()}`} accent="#8A5A2B" />
          <Stat label="Active workers" value={`${summary.data?.activeWorkers ?? 0}`} accent="#2F5D50" />
          <Stat label="Fuel dispensed" value={`${(summary.data?.litres ?? 0).toLocaleString()} L`} accent="#B8542B" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link to="/accounting">
            <Card className="hover:border-ink/30 transition-colors">
              <p className="font-display text-lg" style={{ color: '#8A5A2B' }}>
                Accounting
              </p>
              <p className="text-sm text-ink/50 mt-1">Revenue, expenses, payments made</p>
            </Card>
          </Link>
          <Link to="/operations">
            <Card className="hover:border-ink/30 transition-colors">
              <p className="font-display text-lg" style={{ color: '#2F5D50' }}>
                Operations
              </p>
              <p className="text-sm text-ink/50 mt-1">Worker directory, incidents, promotions</p>
            </Card>
          </Link>
          <Link to="/fuel">
            <Card className="hover:border-ink/30 transition-colors">
              <p className="font-display text-lg" style={{ color: '#B8542B' }}>
                Fuel Monitoring
              </p>
              <p className="text-sm text-ink/50 mt-1">Issuance logs, photo & receipt evidence</p>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link to="/admin/audit-log">
            <Card className="hover:border-ink/30 transition-colors">
              <p className="font-display text-lg" style={{ color: '#6366f1' }}>
                Audit Log
              </p>
              <p className="text-sm text-ink/50 mt-1">Monitor all system activity and user actions - comprehensive security and activity tracking</p>
            </Card>
          </Link>
        </div>

        <Card>
          <p className="text-sm text-ink/60">
            The EVAC system is a separate application by design — it isn't embedded here even for the Super
            Admin, to keep its four-user allow-list enforceable independent of this app. Sign in to it directly at
            its own URL using the same Phelix account.
          </p>
        </Card>
      </div>
    </div>
  )
}
