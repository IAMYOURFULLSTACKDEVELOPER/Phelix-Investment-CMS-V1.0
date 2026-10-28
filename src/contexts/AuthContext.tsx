import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { logLogin, logLogout, logAccountCreation } from '../lib/auditLogger'
import type { Profile } from '../types'

interface AuthState {
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
    const { data: userData } = await supabase.auth.getUser()

    if (profileData && userData.user) {
      setProfile({
        ...profileData,
        email: userData.user.email || ''
      } as Profile | null)
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
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
      
      // Log successful login
      await logLogin()
      
      return { error: null }
    } catch (err) {
      console.error('Signin exception:', err)
      
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          return { error: 'Network error: Cannot connect to Supabase. Please check your internet connection and Supabase URL in .env file.' }
        }
        if (err.message.includes('rate limit') || error.message.includes('rate_limit')) {
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
          }
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
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { error: 'Account created! Please check your email to confirm your account.' }
      }
      
      return { error: null }
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
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
