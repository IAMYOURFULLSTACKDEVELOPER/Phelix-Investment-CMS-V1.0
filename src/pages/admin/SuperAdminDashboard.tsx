import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useLiveTables } from '../../lib/realtime'
import { PageHeader, Card, Stat, Table } from '../../components/ui/Basics'
import type { AppRole } from '../../types'

interface ActiveUser {
  user_id: string
  full_name: string
  email: string
  role: AppRole
  last_seen_at: string
}

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  accountant: 'Accountant',
  operations_supervisor: 'Operations Supervisor',
  fuel_attendant: 'Fuel Attendant',
  evacuation_officer: 'Evacuation Officer'
}

export default function SuperAdminDashboard() {
  const summary = useQuery({
    queryKey: ['admin_summary'],
    queryFn: async () => {
      const [entries, workers, fuel] = await Promise.all([
        supabase.from('accounting_entries').select('type, amount'),
        supabase.from('workers').select('id, status'),
        supabase.from('fuel_logs').select('id, quantity_liters')
      ])
      const revenue = entries.data?.filter((e) => e.type === 'revenue').reduce((s, e) => s + Number(e.amount), 0) ?? 0
      const expense = entries.data?.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0) ?? 0
      const directoryActive = workers.data?.filter((w) => w.status === 'active').length ?? 0
      const litres = fuel.data?.reduce((s, f) => s + Number(f.quantity_liters), 0) ?? 0
      return { revenue, expense, directoryActive, litres }
    }
  })

  const activeUsers = useQuery({
    queryKey: ['active_users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_users')
      if (error) throw error
      return data as ActiveUser[]
    },
    refetchInterval: 30_000
  })

  const recentAccounting = useQuery({
    queryKey: ['admin_recent_accounting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('id, entry_date, type, category, amount, created_at, profiles!accounting_entries_created_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as unknown as {
        id: string
        entry_date: string
        type: string
        category: string
        amount: number
        profiles: { full_name: string } | null
      }[]
    }
  })

  useLiveTables(
    ['accounting_entries', 'fuel_logs', 'workers', 'profiles'],
    [['admin_summary'], ['admin_recent_accounting'], ['active_users']]
  )

  return (
    <div>
      <PageHeader title="Super Admin Overview" sub="Full visibility across every sector, updated live." />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-5 gap-4">
          <Stat label="Total revenue" value={`Le ${(summary.data?.revenue ?? 0).toLocaleString()}`} accent="#8A5A2B" />
          <Stat label="Total expenses" value={`Le ${(summary.data?.expense ?? 0).toLocaleString()}`} accent="#8A5A2B" />
          <Stat label="Active workers (online now)" value={`${activeUsers.data?.length ?? 0}`} accent="#2F5D50" />
          <Stat label="Active in worker directory" value={`${summary.data?.directoryActive ?? 0}`} accent="#2F5D50" />
          <Stat label="Fuel dispensed" value={`${(summary.data?.litres ?? 0).toLocaleString()} L`} accent="#B8542B" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg">Active workers right now</h2>
              <span className="text-xs text-ink/50">Signed in within the last 3 minutes</span>
            </div>
            {activeUsers.error ? (
              <p className="text-sm text-red-600">{(activeUsers.error as Error).message}</p>
            ) : activeUsers.data && activeUsers.data.length > 0 ? (
              <Table head={['Name', 'Role', 'Last active']}>
                {activeUsers.data.map((u) => (
                  <tr key={u.user_id}>
                    <td className="py-2 pr-4">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />
                      {u.full_name}
                      <span className="block text-xs text-ink/50 ml-4">{u.email}</span>
                    </td>
                    <td className="py-2 pr-4">{ROLE_LABEL[u.role]}</td>
                    <td className="py-2 pr-4 text-ink/60">{new Date(u.last_seen_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-sm text-ink/60">No one is signed in right now.</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg">Latest accounting entries</h2>
              <Link to="/accounting" className="text-xs text-ledger hover:underline">
                Open Accounting
              </Link>
            </div>
            {recentAccounting.data && recentAccounting.data.length > 0 ? (
              <Table head={['Date', 'Type', 'Category', 'Amount', 'Logged by']}>
                {recentAccounting.data.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4">{e.entry_date}</td>
                    <td className="py-2 pr-4 capitalize">{e.type}</td>
                    <td className="py-2 pr-4">{e.category}</td>
                    <td className="py-2 pr-4">Le {Number(e.amount).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-ink/60">{e.profiles?.full_name ?? '—'}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-sm text-ink/60">No accounting entries yet.</p>
            )}
          </Card>
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
              <p className="text-sm text-ink/50 mt-1">Issuance logs, photo & receipt evidence, .docx reports</p>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/admin/audit-log">
            <Card className="hover:border-ink/30 transition-colors">
              <p className="font-display text-lg" style={{ color: '#6366f1' }}>
                Audit Log
              </p>
              <p className="text-sm text-ink/50 mt-1">Monitor all system activity and user actions - comprehensive security and activity tracking</p>
            </Card>
          </Link>
          <Link to="/admin/verifications">
            <Card className="hover:border-ink/30 transition-colors">
              <p className="font-display text-lg" style={{ color: '#f59e0b' }}>
                Verifications
              </p>
              <p className="text-sm text-ink/50 mt-1">Approve or reject new user account requests</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
