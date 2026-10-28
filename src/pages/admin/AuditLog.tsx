import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { PageHeader, Card } from '../../components/ui/Basics'

interface AuditLogEntry {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_role: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  success: boolean
  error_message: string | null
  created_at: string
}

export default function AuditLog() {
  const auditLogs = useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      return data as AuditLogEntry[]
    }
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-red-600'
    if (action.includes('create') || action.includes('add')) return 'text-green-600'
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600'
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600'
    if (action.includes('login') || action.includes('signin')) return 'text-purple-600'
    return 'text-gray-600'
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800'
      case 'accountant': return 'bg-blue-100 text-blue-800'
      case 'operations_supervisor': return 'bg-green-100 text-green-800'
      case 'fuel_attendant': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div>
      <PageHeader 
        title="Audit Log" 
        sub="Monitor all system activity and user actions - comprehensive security and activity tracking." 
      />
      
      <div className="p-8 space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <span className="text-sm text-gray-500">
                {auditLogs.data?.length || 0} entries
              </span>
            </div>

            {auditLogs.isLoading ? (
              <div className="text-center py-8 text-sm text-ink/60">
                Loading audit logs...
              </div>
            ) : auditLogs.error ? (
              <div className="text-center py-8 text-sm text-red-600">
                Error loading audit logs: {auditLogs.error.message}
              </div>
            ) : !auditLogs.data || auditLogs.data.length === 0 ? (
              <div className="text-center py-8 text-sm text-ink/60">
                No audit log entries found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Entity
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.data.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{log.user_name}</div>
                            <div className="text-xs text-gray-500">{log.user_email}</div>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRoleBadgeColor(log.user_role)}`}>
                              {formatRole(log.user_role)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getActionColor(log.action, log.success)}`}>
                              {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {!log.success && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                Failed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {log.entity_type ? (
                              <div>
                                <span className="font-medium">{log.entity_type.replace(/_/g, ' ')}</span>
                                {log.entity_id && (
                                  <span className="text-ink/50 text-xs ml-2">
                                    ID: {log.entity_id.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.success 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-700">
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {auditLogs.data && auditLogs.data.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-phelix-medium">
                  {auditLogs.data.filter(log => log.action.includes('create') || log.action.includes('add')).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Creations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {auditLogs.data.filter(log => log.action.includes('update') || log.action.includes('edit')).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Updates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {auditLogs.data.filter(log => log.action.includes('delete') || log.action.includes('remove')).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Deletions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {auditLogs.data.filter(log => log.success).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {auditLogs.data.filter(log => !log.success).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Failed</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}