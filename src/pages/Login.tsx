import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, CheckCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('fuel_attendant')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    // Check if user is in cooldown period
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again.`)
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error)
          // Set cooldown if it's a rate limit error
          if (error.includes('rate limit') || error.includes('Too many')) {
            setCooldown(60) // 1 minute cooldown
            startCooldownTimer()
          }
        }
      } else {
        const { error } = await signUp(email, password, fullName, role)
        if (error) {
          setError(error)
          // Set cooldown if it's a rate limit error
          if (error.includes('rate limit') || error.includes('Too many')) {
            setCooldown(60) // 1 minute cooldown
            startCooldownTimer()
          }
        } else {
          // Show success animation for account creation
          setShowSuccessAnimation(true)
          setTimeout(() => {
            setShowSuccessAnimation(false)
            setIsLogin(true)
          }, 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      console.error('Form submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  function startCooldownTimer() {
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function toggleForm() {
    setIsLogin(!isLogin)
    setError(null)
    setEmail('')
    setPassword('')
    setFullName('')
    setRole('fuel_attendant')
    setCooldown(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-phelix-gradient px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-white font-semibold">Phelix Investment</h1>
          <p className="text-sm text-white/80 mt-2">Content Management System</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-white block mb-2">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-phelix-accent transition-all pr-10"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-white block mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-phelix-accent transition-all pr-10"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-white block mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-phelix-accent transition-all pr-10"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>
            
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-white block mb-2">Role</label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-phelix-accent transition-all"
                >
                  <option value="fuel_attendant">Fuel Attendant</option>
                  <option value="accountant">Accountant</option>
                  <option value="operations_supervisor">Operations Supervisor</option>
                  <option value="evacuation_officer">Evacuation Officer</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-xs text-red-200">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={submitting || cooldown > 0}
              className="w-full bg-phelix-medium hover:bg-phelix-light text-white border-2 border-white rounded-lg py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0 
                ? `Please wait ${cooldown}s...` 
                : submitting 
                  ? (isLogin ? 'Signing in…' : 'Creating account…') 
                  : (isLogin ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          {showSuccessAnimation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 text-center animate-bounce">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Account Created Successfully!</h3>
                <p className="text-sm text-gray-600">Redirecting to sign in...</p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleForm}
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Create Account" : 'Already Have an Account? Sign In!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
