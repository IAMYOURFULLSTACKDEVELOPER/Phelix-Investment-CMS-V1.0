import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, User, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WelcomeLoading from '../components/WelcomeLoading'
import { APPROVED_EMAIL_KEY } from '../components/PendingApproval'

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
  const [showIntro, setShowIntro] = useState(true)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formRef.current) formRef.current.inert = showIntro
  }, [showIntro])
  const [authSuccess, setAuthSuccess] = useState(false)
  const [typingPassword, setTypingPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const approvedEmail = sessionStorage.getItem(APPROVED_EMAIL_KEY)
    if (approvedEmail) {
      sessionStorage.removeItem(APPROVED_EMAIL_KEY)
      setIsLogin(true)
      setEmail(approvedEmail)
      setNotice('You have been approved by the Super Admin. Sign in with your email and password to open your panel.')
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    // Check if user is in cooldown period
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again.`)
      return
    }
    
    setSubmitting(true)
    setError(null)
    setNotice(null)
    setAuthSuccess(false)
    setTypingPassword('')
    
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
        } else {
          // Show success animation for sign in
          setAuthSuccess(true)
          setTimeout(() => {
            setAuthSuccess(false)
          }, 3000)
        }
      } else {
        // Start typing animation for sign up
        const passwordLength = password.length
        let currentLength = 0
        
        const typingInterval = setInterval(() => {
          if (currentLength < passwordLength) {
            setTypingPassword(prev => prev + '*')
            currentLength++
          } else {
            clearInterval(typingInterval)
          }
        }, 100)
        
        const { error, notice: signUpNotice } = await signUp(email, password, fullName, role)
        clearInterval(typingInterval)
        
        if (error) {
          setError(error)
          setTypingPassword('')
          // Set cooldown if it's a rate limit error
          if (error.includes('rate limit') || error.includes('Too many')) {
            setCooldown(60) // 1 minute cooldown
            startCooldownTimer()
          }
        } else {
          // Show success animation for account creation
          if (signUpNotice) setNotice(signUpNotice)
          setShowSuccessAnimation(true)
          setTimeout(() => {
            setShowSuccessAnimation(false)
            setIsLogin(true)
            setTypingPassword('')
          }, 3000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      console.error('Form submission error:', err)
      setTypingPassword('')
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
    setNotice(null)
    setShowPassword(false)
    setEmail('')
    setPassword('')
    setFullName('')
    setRole('fuel_attendant')
    setCooldown(0)
  }

  return (
    <>
      {/* Welcome Loading Screen */}
      <AnimatePresence>
        {showIntro && (
          <WelcomeLoading onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={showIntro ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="min-h-screen flex items-center justify-center bg-phelix-gradient px-4"
        ref={formRef}
      >
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-phelix-accent transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
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
            
            {notice && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                <p className="text-xs text-green-100">{notice}</p>
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

          {/* Sign In Success Animation */}
          <AnimatePresence>
            {authSuccess && isLogin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6"
              >
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5, delay: 0.2 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-3"
                  >
                    <CheckCircle className="h-10 w-10 text-white" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-green-300 font-semibold text-sm"
                  >
                    Welcome Back our Prestigious User
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign Up Loading Animation */}
          <AnimatePresence>
            {submitting && !isLogin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6"
              >
                <div className="bg-white/10 border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-full max-w-xs h-12 bg-black/50 rounded-lg border-2 border-white/30 flex items-center justify-center overflow-hidden relative">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="absolute top-0 left-0 h-full bg-green-500/30"
                      />
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-green-400 font-mono text-lg tracking-widest z-10"
                      >
                        {typingPassword || '****'}
                      </motion.span>
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center space-x-1"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="w-2 h-2 bg-green-400 rounded-full"
                      />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign Up Success Animation */}
          <AnimatePresence>
            {showSuccessAnimation && !isLogin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mt-6"
              >
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-3"
                  >
                    <CheckCircle className="h-10 w-10 text-white" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-green-300 font-semibold"
                  >
                    Account Created Successfully!
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-green-300/70 text-sm mt-1"
                  >
                    Redirecting to sign in...
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
      </motion.div>
    </>
  )
}
