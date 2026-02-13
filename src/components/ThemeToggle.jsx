import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('wanderword-theme') === 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('wanderword-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <motion.button
      onClick={() => setDark(d => !d)}
      className="p-2 border transition-all hover:opacity-80"
      style={{
        borderColor: 'var(--text-primary)',
        color: 'var(--text-primary)',
        background: 'var(--surface)',
      }}
      whileTap={{ scale: 0.9 }}
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </motion.button>
  )
}
