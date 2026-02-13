import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Sparkles } from 'lucide-react'

export default function LandingOverlay({ onComplete }) {
  const [phase, setPhase] = useState(0) // 0: globe entry, 1: title, 2: subtitle, 3: fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => onComplete(), 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'var(--bg-primary)' }}
        >
          {/* Animated globe */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: phase >= 0 ? 1 : 0, rotate: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="mb-8"
          >
            <div className="w-20 h-20 flex items-center justify-center border-2"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              <Globe size={48} strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-doto font-bold tracking-tight mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            WANDERWORD
          </motion.h1>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-[1px]" style={{ background: 'var(--text-primary)' }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] font-mono"
              style={{ color: 'var(--text-secondary)' }}>
              Etymology Visualized
            </p>
            <div className="w-12 h-[1px]" style={{ background: 'var(--text-primary)' }} />
          </motion.div>

          {/* Decorative corners */}
          <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: 'var(--text-primary)', opacity: 0.2 }} />
          <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: 'var(--text-primary)', opacity: 0.2 }} />
          <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: 'var(--text-primary)', opacity: 0.2 }} />
          <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: 'var(--text-primary)', opacity: 0.2 }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
