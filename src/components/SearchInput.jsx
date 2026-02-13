import React, { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SearchInput({ onSearch, isLoading, disabled }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim() && !isLoading) onSearch(value.trim())
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isLoading || disabled}
          placeholder="ENTER WORD TO TRACE..."
          className="w-full border px-10 py-2.5 outline-none transition-all font-mono uppercase font-bold text-xs"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--text-primary)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-primary)' }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
        <button
          type="submit"
          disabled={isLoading || disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 font-mono font-bold text-[10px] transition-all active:translate-x-[1px] active:translate-y-[1px]"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg-primary)',
          }}
        >
          {isLoading ? '...' : 'TRACE'}
        </button>
      </form>
    </motion.div>
  )
}
