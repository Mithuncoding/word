import React from 'react'
import { motion } from 'framer-motion'
import { Globe, Languages, Clock, Route } from 'lucide-react'

export default function StatsBar({ data }) {
  if (!data) return null

  const langCount = data.journey.length + 1 // origin + journey steps
  const centurySpan = getCenturySpan(data)
  const routeType = data.routeSummary

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 flex gap-2 md:gap-4 font-mono"
    >
      <StatChip icon={<Languages size={12} />} label="LANGUAGES" value={langCount} />
      <StatChip icon={<Clock size={12} />} label="TIME SPAN" value={centurySpan} />
      <StatChip icon={<Route size={12} />} label="ROUTE" value={routeType.toUpperCase()} />
    </motion.div>
  )
}

function StatChip({ icon, label, value }) {
  return (
    <div className="border px-3 py-1.5 flex items-center gap-2 backdrop-blur-sm"
      style={{
        borderColor: 'var(--text-primary)',
        background: 'var(--bg-panel)',
        color: 'var(--text-primary)',
      }}>
      {icon}
      <div>
        <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="text-[11px] font-black uppercase">{value}</div>
      </div>
    </div>
  )
}

function getCenturySpan(data) {
  const centuries = [data.origin.century, ...data.journey.map(j => j.century)]
  const nums = centuries.map(c => {
    if (c === 'Ancient') return -5
    const m = c.match(/(\d+)/)
    return m ? parseInt(m[1]) : 0
  }).filter(n => n !== 0)
  if (nums.length < 2) return 'N/A'
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const start = min < 0 ? `${Math.abs(min)}th BC` : `${min}th`
  const end = `${max}th`
  return `${start}→${end}`
}
