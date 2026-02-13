import React from 'react'
import { Play, Pause, FastForward, Rewind, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function PlaybackControls({
  isPlaying, onTogglePlay, onNext, onPrev, onReset,
  playbackSpeed, onSetSpeed, progress, canGoNext, canGoPrev
}) {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 font-mono">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border p-2 flex items-center gap-4 backdrop-blur-sm"
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--text-primary)',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Transport controls */}
        <div className="flex items-center gap-1 border-r pr-3" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
          <button
            onClick={onReset}
            className="p-1.5 transition-colors hover:opacity-70"
            style={{ color: 'var(--text-primary)' }}
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="p-1.5 transition-colors disabled:opacity-20"
            style={{ color: 'var(--text-primary)' }}
          >
            <Rewind size={18} />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-2 transition-all active:translate-x-[1px] active:translate-y-[1px]"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="p-1.5 transition-colors disabled:opacity-20"
            style={{ color: 'var(--text-primary)' }}
          >
            <FastForward size={18} />
          </button>
        </div>

        {/* Speed controls */}
        <div className="flex gap-1">
          {[0.5, 1, 2].map(speed => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className="px-2 py-0.5 text-[9px] font-black transition-all border"
              style={{
                background: playbackSpeed === speed ? 'var(--accent)' : 'transparent',
                color: playbackSpeed === speed ? 'var(--bg-primary)' : 'var(--text-primary)',
                borderColor: playbackSpeed === speed ? 'var(--accent)' : 'transparent',
              }}
            >
              {speed}X
            </button>
          ))}
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-[60vw] max-w-xs h-1 border overflow-hidden"
        style={{ borderColor: 'var(--text-primary)', background: 'var(--surface)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'var(--accent)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}
