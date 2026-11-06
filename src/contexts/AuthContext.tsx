import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { logLogin, logLogout, logAccountCreation } from '../lib/auditLogger'
import type { Profile } from '../types'

interface AuthState {
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: string | null; notice?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
}

const PRESENCE_INTERVAL_MS = 60_000

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
    const { data: userData } = await supabase.auth.getUser()

    if (profileData && userData.user) {
      if (profileData.verification_status === 'rejected') {
        await supabase.auth.signOut()
        setProfile(null)
        return null
      }
      const next = { ...profileData, email: userData.user.email || '' } as Profile
      setProfile(next)
      return next
    }
    setProfile(null)
    return null
  }

  async function refreshProfile() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    return loadProfile(data.session.user.id)
  }

  const isApproved = !!profile && (profile.verification_status ?? 'approved') === 'approved'

  useEffect(() => {
    if (!isApproved) return
    const ping = () => {
      supabase.rpc('touch_last_seen').then(({ error }) => {
        if (error) console.error('Presence ping failed:', error)
      })
    }
    ping()
    const timer = setInterval(ping, PRESENCE_INTERVAL_MS)
    const onVisible = () => document.visibilityState === 'visible' && ping()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isApproved, profile?.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: awaiting Supabase calls inside this callback can deadlock the auth client.
      if (session) setTimeout(() => loadProfile(session.user.id), 0)
      else setProfile(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Supabase signin error:', error)

        // Provide more helpful error messages
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return { error: 'Network error: Cannot connect to Supabase. Please check your internet connection and Supabase URL in .env file.' }
        }
        if (error.message.includes('rate limit') || error.message.includes('rate_limit')) {
          return { error: 'Too many sign-in attempts. Please wait a few minutes before trying again.' }
        }
        if (error.message.includes('Invalid login')) {
          return { error: 'Invalid email or password' }
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Please confirm your email address before signing in' }
        }

        return { error: error.message }
      }

      // Check if user's account is approved
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('verification_status, rejection_reason')
          .eq('id', data.user.id)
          .single()

        if (profileData) {
          // If verification_status doesn't exist (old profile), treat as approved
          const verificationStatus = profileData.verification_status || 'approved'

          if (verificationStatus === 'pending') {
            // Keep the session: the app shows the "awaiting approval" screen.
            return { error: null }
          }
          if (verificationStatus === 'rejected') {
            await supabase.auth.signOut()
            return { error: `Your account request was rejected. Reason: ${profileData.rejection_reason || 'Not specified'}` }
          }
        }
      }

      // Log successful login
      await logLogin()

      return { error: null }
    } catch (err) {
      console.error('Signin exception:', err)

      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          return { error: 'Network error: Cannot connect to Supabase. Please check your internet connection and Supabase URL in .env file.' }
        }
        if (err.message.includes('rate limit') || err.message.includes('rate_limit')) {
          return { error: 'Too many sign-in attempts. Please wait a few minutes before trying again.' }
        }
        return { error: err.message }
      }

      return { error: 'Failed to sign in. Please try again.' }
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          },
          emailRedirectTo: window.location.origin
        }
      })

      if (error) {
        console.error('Supabase signup error:', error)

        // Provide more helpful error messages
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return { error: 'Network error: Cannot connect to Supabase. Please check your internet connection and Supabase URL in .env file.' }
        }
        if (error.message.includes('rate limit') || error.message.includes('rate_limit')) {
          return { error: 'Too many signup attempts. Please wait a few minutes before trying again.' }
        }
        if (error.message.includes('email') && !error.message.includes('rate')) {
          return { error: 'Invalid email address format' }
        }
        if (error.message.includes('password')) {
          return { error: 'Password is too weak. Please use a stronger password.' }
        }
        if (error.message.includes('already registered')) {
          return { error: 'An account with this email already exists' }
        }

        return { error: error.message }
      }

      console.log('Signup successful:', data)

      // Log account creation
      if (data.user) {
        await logAccountCreation()
      }

      // With a session the app switches to the "awaiting approval" screen;
      // without one (email confirmation on) the user signs in after approval.
      return {
        error: null,
        notice: data.session
          ? undefined
          : 'Account created successfully! Your account is pending approval from the Super Admin. You can sign in once it has been approved.'
      }
    } catch (err) {
      console.error('Signup exception:', err)

      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          return { error: 'Network error: Cannot connect to Supabase. Please check your internet connection and Supabase URL in .env file.' }
        }
        if (err.message.includes('rate limit') || err.message.includes('rate_limit')) {
          return { error: 'Too many signup attempts. Please wait a few minutes before trying again.' }
        }
        return { error: err.message }
      }

      return { error: 'Failed to create account. Please try again.' }
    }
  }

  async function signOut() {
    // Log logout before signing out
    await logLogout()
    await supabase.rpc('mark_offline')
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
