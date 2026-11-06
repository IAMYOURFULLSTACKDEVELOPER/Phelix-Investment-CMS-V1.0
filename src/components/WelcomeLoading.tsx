import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface WelcomeLoadingProps {
  onComplete: () => void
}

export default function WelcomeLoading({ onComplete }: WelcomeLoadingProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show welcome screen for 6 seconds
    const timer = setTimeout(() => {
      setIsLoading(false)
      onComplete()
    }, 6000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!isLoading) return null

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-phelix-gradient z-50 flex flex-col items-center justify-center px-4"
    >
      {/* Welcome Text */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-center mb-12"
      >
        <h1 className="font-display text-4xl md:text-5xl text-white font-semibold mb-4">
          Welcome to
        </h1>
        <h2 className="font-display text-3xl md:text-4xl text-white font-semibold">
          Phelix Investment CMS
        </h2>
      </motion.div>

      {/* Green Loading Spinner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative"
      >
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 md:w-20 md:h-20 border-4 border-green-400/30 rounded-full"
        />
        
        {/* Inner spinning segment */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-16 h-16 md:w-20 md:h-20"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-green-400 rounded-full shadow-lg shadow-green-400/50" />
        </motion.div>

        {/* Inner circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-phelix-gradient rounded-full" />
      </motion.div>

      {/* Loading text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-8 text-green-400 text-sm md:text-base font-medium"
      >
        Loading your workspace...
      </motion.p>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: '200px' }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mt-6 h-1 bg-white/20 rounded-full overflow-hidden"
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: "easeInOut", delay: 0.8 }}
          className="h-full bg-green-400 rounded-full"
        />
      </motion.div>
    </motion.div>
  )
}
