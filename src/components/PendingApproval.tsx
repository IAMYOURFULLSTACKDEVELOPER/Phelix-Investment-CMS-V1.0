import { useEffect, useState } from 'react'
import { CheckCircle, Clock, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export const APPROVED_EMAIL_KEY = 'phelix_approved_email'
const POLL_MS = 5000
const REDIRECT_DELAY_MS = 3500

export default function PendingApproval() {
  const { profile, refreshProfile } = useAuth()
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    if (!profile || approved) return
    let cancelled = false

    async function check() {
      const { data } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', profile!.id)
        .single()
      if (!cancelled && data?.verification_status === 'approved') setApproved(true)
      if (!cancelled && data?.verification_status === 'rejected') await refreshProfile()
    }

    const timer = setInterval(check, POLL_MS)
    const channel = supabase
      .channel(`profile_status_${profile.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, check)
      .subscribe()
    check()

    return () => {
      cancelled = true
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [profile?.id, approved])

  useEffect(() => {
    if (!approved || !profile) return
    const timer = setTimeout(async () => {
      sessionStorage.setItem(APPROVED_EMAIL_KEY, profile.email)
      await supabase.auth.signOut()
      window.location.assign('/login')
    }, REDIRECT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [approved, profile])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-phelix-gradient px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center text-white">
        {approved ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">You have been approved by the Super Admin</h2>
            <p className="text-sm text-white/80">Redirecting you to the sign in page. Sign in with your email and password to open your panel.</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Clock className="h-9 w-9 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Awaiting Super Admin approval</h2>
            <p className="text-sm text-white/80">
              Hello {profile?.full_name}, your account has been created and is waiting for approval. This page updates
              automatically once the Super Admin approves it.
            </p>
            <button
              onClick={handleSignOut}
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  )
}
