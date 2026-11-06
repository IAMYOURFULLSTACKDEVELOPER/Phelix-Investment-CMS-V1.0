import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { PageHeader, Card } from '../../components/ui/Basics'
import { Check, X, Loader2, AlertCircle } from 'lucide-react'

interface PendingUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export default function Verifications() {
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const pendingUsers = useQuery({
    queryKey: ['pending_verifications'],
    queryFn: async () => {
      // Use the RPC function to get pending verifications with emails
      const { data, error } = await supabase
        .rpc('get_pending_verifications')

      if (error) throw error

      return data as PendingUser[]
    }
  })

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('approve_user_account', {
        p_user_id: userId
      })
      if (error) throw error

      // Note: The confirmation email will be sent via Supabase Edge Function or backend service
      // For now, the account is approved and the user can sign in (if email confirmation is disabled)
      // or request a new confirmation email through the login flow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_verifications'] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_user_account', {
        p_user_id: userId,
        p_reason: reason
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_verifications'] })
      setShowRejectDialog(false)
      setRejectReason('')
      setRejectingId(null)
    }
  })

  const handleApprove = (userId: string) => {
    approveMutation.mutate(userId)
  }

  const handleRejectClick = (userId: string) => {
    setRejectingId(userId)
    setShowRejectDialog(true)
  }

  const handleRejectConfirm = () => {
    if (rejectingId && rejectReason.trim()) {
      rejectMutation.mutate({ userId: rejectingId, reason: rejectReason })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800'
      case 'accountant': return 'bg-blue-100 text-blue-800'
      case 'operations_supervisor': return 'bg-green-100 text-green-800'
      case 'fuel_attendant': return 'bg-orange-100 text-orange-800'
      case 'evacuation_officer': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <PageHeader
        title="User Verifications"
        sub="Review and approve new user account requests before verification emails are sent."
      />

      <div className="p-8 space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pending Approvals</h3>
              <span className="text-sm text-gray-500">
                {pendingUsers.data?.length || 0} pending accounts
              </span>
            </div>

            {pendingUsers.isLoading ? (
              <div className="text-center py-8 text-sm text-ink/60">
                Loading pending verifications...
              </div>
            ) : pendingUsers.error ? (
              <div className="text-center py-8 text-sm text-red-600">
                Error loading verifications: {pendingUsers.error.message}
              </div>
            ) : !pendingUsers.data || pendingUsers.data.length === 0 ? (
              <div className="text-center py-8 text-sm text-ink/60">
                No pending verifications
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
                        Role
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Requested At
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingUsers.data.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-700">
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(user.id)}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(user.id)}
                              disabled={rejectMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
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

        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Verification Process</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• New accounts are created with "pending" status</li>
                <li>• Approving an account allows the user to sign in immediately</li>
                <li>• Users cannot sign in until their account is approved</li>
                <li>• Rejected accounts are marked with a reason for documentation</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Account Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this account request. This will be recorded for documentation purposes.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectDialog(false)
                  setRejectReason('')
                  setRejectingId(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rejecting...
                  </div>
                ) : (
                  'Reject Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
