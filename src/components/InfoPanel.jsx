import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Anchor, Landmark, Lightbulb, Volume2, Share2, Copy, ChevronUp, ChevronDown } from 'lucide-react'

// Language Mapping for Polyglot TTS
const LANG_MAP = {
  'Old Chinese': 'zh-CN', 'Mandarin': 'zh-CN', 'Min Nan (Hokkien)': 'zh-TW', 'Chinese': 'zh-CN',
  'Arabic': 'ar-SA', 'Persian': 'fa-IR', 'Hindi': 'hi-IN', 'Sanskrit': 'hi-IN', 'Bengali': 'bn-IN',
  'Japanese': 'ja-JP', 'Korean': 'ko-KR', 'Malay': 'id-ID', 'Swahili': 'sw-KE',
  'French': 'fr-FR', 'Old French': 'fr-FR',
  'German': 'de-DE', 'Italian': 'it-IT', 'Spanish': 'es-ES', 'Portuguese': 'pt-PT',
  'Russian': 'ru-RU', 'Czech': 'cs-CZ', 'Slavic': 'ru-RU',
  'Latin': 'it-IT', 'Greek': 'el-GR', 'Gaelic': 'en-IE', 'Old Irish': 'en-IE',
  'English': 'en-GB', 'Middle English': 'en-GB', 'American English': 'en-US'
}

export default function InfoPanel({ data, onClose, activeWaypointIndex, onSpeak }) {
  const [copied, setCopied] = useState(false)
  const [isMobileMinimized, setIsMobileMinimized] = useState(false)

  if (!data) return null

  const getVoiceLang = (langName) => {
    // Default to GB English if unknown
    return LANG_MAP[langName] || 'en-GB'
  }

  const speakWord = (word, langName) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(word)
      utt.rate = 0.8
      utt.lang = getVoiceLang(langName)
      
      // Try to find a matching voice for better quality
      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find(v => v.lang.includes(utt.lang))
      if (matchingVoice) utt.voice = matchingVoice

      window.speechSynthesis.speak(utt)
    }
  }

  const handleCopyPassport = () => {
    const lines = [
      `🎫 WANDERWORD PASSPORT: ${data.word.toUpperCase()}`,
      `Origin: ${data.origin.word} (${data.origin.language})`,
      `Meaning: ${data.currentMeaning}`,
      `Journey:`,
      ...data.journey.map((step, i) => ` ${i+1}. ${step.word} (${step.location.name})`),
      `\nExplore more at: ${window.location.href}`
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`fixed bottom-0 md:top-0 right-0 w-full md:w-[480px] bg-[var(--bg-panel)] backdrop-blur-md shadow-2xl transform transition-all duration-500 ease-out z-50 flex flex-col md:border-l border-[var(--text-secondary)] translate-x-0
        ${isMobileMinimized ? 'h-[80px]' : 'h-[60vh]'} md:h-full rounded-t-3xl md:rounded-none`}
    >
      {/* Mobile Drag Handle / Toggle */}
      <div 
        onClick={() => setIsMobileMinimized(!isMobileMinimized)}
        className="md:hidden w-full h-6 flex items-center justify-center cursor-pointer border-b border-[var(--text-primary)]/20 active:bg-black/5"
      >
        <div className="w-12 h-1 bg-[var(--text-secondary)] rounded-full opacity-50" />
      </div>

      {/* Header */}
      <div className="p-4 md:p-6 border-b flex justify-between items-start shrink-0" style={{ borderColor: 'var(--text-primary)' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-4xl font-doto capitalize leading-none truncate">{data.word}</h1>
            <button onClick={() => speakWord(data.word, 'English')} className="p-1 opacity-40 hover:opacity-100 transition-opacity shrink-0" title="Pronounce">
              <Volume2 size={16} />
            </button>
          </div>
          <p className="text-[10px] font-bold tracking-widest uppercase mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
            / Definition: {data.currentMeaning}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 ml-2">
           <button
            onClick={handleCopyPassport}
            className="p-1 border transition-colors hover:bg-[var(--accent)] hover:text-black hidden md:block" // Hide share on very small screens if space is tight, or keep it
            style={{ borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }}
            title="Copy Passport"
          >
            {copied ? <span className="text-[9px] font-bold px-1">COPIED</span> : <Copy size={20} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 border transition-colors hover:bg-red-500 hover:text-white"
            style={{ borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content (Scrollable) */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar ${isMobileMinimized ? 'hidden md:block' : ''}`}>
        {/* Origin */}
        <section className="space-y-4">
          <div className="px-2 py-1 inline-block text-[10px] font-bold uppercase"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
            00_Origin_Point
          </div>
          <div className="border p-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-doto">"{data.origin.word}"</p>
              <button 
                onClick={() => speakWord(data.origin.word, data.origin.language)} 
                className="p-1 opacity-30 hover:opacity-100 transition-opacity"
                title={`Speak in ${data.origin.language}`}
              >
                <Volume2 size={12} />
              </button>
            </div>
            <p className="text-[10px] font-bold mb-2 uppercase" style={{ color: 'var(--text-secondary)' }}>
              {data.origin.language} // {data.origin.century}
            </p>
            <p className="text-xs leading-relaxed border-t pt-2" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
              MEANING: <span className="font-bold">{data.origin.meaning}</span>
            </p>
            <div className="flex items-center gap-1 mt-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={10} />
              <span>LOC: {data.origin.location.name}</span>
            </div>
          </div>
        </section>

        {/* Narrative */}
        <section className="space-y-4">
          <div className="px-2 py-1 inline-block text-[10px] font-bold uppercase"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
            01_Historical_Narrative
          </div>
          <p className="text-xs leading-relaxed border p-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--surface)' }}>
            {data.narrative}
          </p>
        </section>

        {/* Migration Log */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-2 py-1 inline-block text-[10px] font-bold uppercase"
              style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
              02_Migration_Log
            </div>
            <span className="text-[9px] px-2 py-0.5 border font-black uppercase tracking-tighter"
              style={{ borderColor: 'var(--text-primary)' }}>
              {data.routeSummary}_ROUTE
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px]"
            style={{ '--tw-before-bg': 'var(--text-primary)' }}>
            <div className="absolute left-[3px] top-2 bottom-2 w-[1px]" style={{ background: 'var(--text-primary)' }} />
            {data.journey.map((step, idx) => (
              <div key={idx} className={`relative transition-all ${idx <= activeWaypointIndex ? 'opacity-100' : 'opacity-20'}`}>
                <div className={`absolute -left-[27px] top-1 w-2 h-2 border transition-colors`}
                  style={{
                    borderColor: 'var(--text-primary)',
                    background: idx <= activeWaypointIndex ? 'var(--accent)' : 'transparent'
                  }}
                />
                <div className={`p-4 border transition-all ${
                  activeWaypointIndex === idx
                    ? 'border-current'
                    : 'border-opacity-20'
                }`} style={{
                  borderColor: activeWaypointIndex === idx ? 'var(--text-primary)' : 'rgba(128,128,128,0.2)',
                  background: activeWaypointIndex === idx ? 'var(--surface)' : 'transparent',
                  boxShadow: activeWaypointIndex === idx ? 'var(--shadow)' : 'none',
                }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-doto">"{step.word}"</p>
                      <button 
                         onClick={() => speakWord(step.word, step.language)} 
                         className="p-0.5 opacity-30 hover:opacity-100 transition-opacity"
                         title={`Speak in ${step.language}`}
                      >
                        <Volume2 size={10} />
                      </button>
                    </div>
                    {step.routeType === 'sea' ? <Anchor size={14} /> : <Landmark size={14} />}
                  </div>
                  <p className="text-[9px] font-bold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Stage_{idx + 1} // {step.language} // {step.century}
                  </p>
                  <p className="text-[10px] leading-normal" style={{ color: 'var(--text-secondary)' }}>
                    {step.notes}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fun Fact */}
        {data.funFact && (
          <section className="border border-dashed p-4" style={{ borderColor: 'var(--text-primary)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={12} />
              <h4 className="text-[9px] uppercase font-black tracking-widest">_Addendum_</h4>
            </div>
            <p className="text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>
              "{data.funFact}"
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
