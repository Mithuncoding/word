import React, { useState, useEffect, useRef, useCallback } from 'react'
import WorldMap from './components/WorldMap'
import SearchInput from './components/SearchInput'
import InfoPanel from './components/InfoPanel'
import PlaybackControls from './components/PlaybackControls'
import ThemeToggle from './components/ThemeToggle'
import StatsBar from './components/StatsBar'
import LandingOverlay from './components/LandingOverlay'
import { fetchWordJourney, ALL_WORDS } from './data/etymologyData'
import { Terminal, Info, ChevronLeft, ChevronRight, Share2, Volume2, Heart } from 'lucide-react'
import { playSound } from './utils/audio'

const LOADING_MESSAGES = [
  "RESEARCHING_LINGUISTIC_ROOTS...",
  "言葉のルートを辿っています...",
  "正在研究语言根源...",
  "RECHERCHE DES RACINES LINGUISTIQUES...",
  "INVESTIGANDO RAÍCES LINGÜÍSTICAS...",
  "ИССЛЕДОВАНИЕ КОРНЕЙ...",
  "शब्द की जड़ें खोज रहे हैं...",
]

const IS_SEARCH_PAUSED = false
const VISIBLE_COUNT = 5

export default function App() {
  const [journeyData, setJourneyData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeWaypointIndex, setActiveWaypointIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showPanel, setShowPanel] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [showLanding, setShowLanding] = useState(true)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wanderword-favorites')) || [] } catch { return [] }
  })
  

  
  // Suggestions carousel state
  const [startIndex, setStartIndex] = useState(0)
  
  const timerRef = useRef(null)

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('wanderword-favorites', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (word) => {
    playSound('click')
    setFavorites(prev => 
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    )
  }

  // Loading message cycler
  useEffect(() => {
    let interval
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
      }, 1200)
    }
    return () => clearInterval(interval)
  }, [isLoading])

  const handleSearch = async (word) => {
    playSound('click')
    setIsLoading(true)
    setError(null)
    setIsPlaying(false)
    setActiveWaypointIndex(-1)
    setShowPanel(false)
    
    try {
      const data = await fetchWordJourney(word)
      setJourneyData(data)
      setShowPanel(true)
      playSound('arrival')
      // Auto-play after a short delay
      setTimeout(() => setIsPlaying(true), 800)
    } catch (err) {
      setError(err.message || "RESEARCH_FAILED")
    } finally {
      setIsLoading(false)
    }
  }

  // Playback logic
  const handleNext = useCallback(() => {
    if (!journeyData) return
    setActiveWaypointIndex(prev => {
      const next = prev + 1
      if (next >= journeyData.journey.length) {
        setIsPlaying(false)
        return prev
      }
      playSound('step')
      return next
    })
  }, [journeyData])

  const handlePrev = useCallback(() => {
    playSound('step')
    setActiveWaypointIndex(prev => Math.max(-1, prev - 1))
  }, [])

  useEffect(() => {
    if (isPlaying && journeyData) {
      if (activeWaypointIndex < journeyData.journey.length - 1) {
        timerRef.current = setTimeout(() => {
          handleNext()
        }, 2000 / playbackSpeed)
      } else {
        setIsPlaying(false)
      }
    }
    return () => clearTimeout(timerRef.current)
  }, [isPlaying, activeWaypointIndex, journeyData, handleNext, playbackSpeed])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!journeyData || isLoading) return
      
      if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [journeyData, isLoading, handleNext, handlePrev])

  const progress = journeyData ? (activeWaypointIndex + 1) / (journeyData.journey.length + 1) : 0

  const handleShare = () => {
    if (journeyData) {
      const url = `${window.location.origin}?word=${journeyData.word}`
      navigator.clipboard.writeText(url)
      alert("Journey link copied to clipboard!")
      playSound('click')
    }
  }

  // Audio Context Resume
  useEffect(() => {
    const resumeAudio = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        const ctx = new AudioContext()
        if (ctx.state === 'suspended') ctx.resume()
      }
    }
    document.addEventListener('click', resumeAudio, { once: true })
    document.addEventListener('touchstart', resumeAudio, { once: true })
    return () => {
      document.removeEventListener('click', resumeAudio)
      document.removeEventListener('touchstart', resumeAudio)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-mono" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {showLanding && <LandingOverlay onComplete={() => setShowLanding(false)} />}
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b z-30 shrink-0 relative backdrop-blur-sm" 
        style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-panel)' }}>
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-1" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
              <Terminal size={20} />
            </div>
            <h1 className="text-2xl font-doto font-bold tracking-tight leading-none hidden md:block">WANDERWORD</h1>
            <h1 className="text-xl font-doto font-bold tracking-tight leading-none md:hidden">WW_OS</h1>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest px-1 w-fit hidden md:block" 
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            System.Research.Global_Lithomology
          </div>
        </div>

        <div className="flex flex-col items-center flex-1 max-w-xl mx-4 md:mx-8 relative">
          {activeWaypointIndex === -1 && !journeyData ? (
             <div className="w-full flex flex-col gap-2 items-center">
               <SearchInput onSearch={handleSearch} isLoading={isLoading} />
               {/* Suggestions Carousel */}
               <div className="flex items-center gap-2 w-full mt-2">
                 <button 
                   onClick={() => { setStartIndex(p => Math.max(0, p - 1)); playSound('hover'); }}
                   disabled={startIndex === 0}
                   className="p-1 disabled:opacity-20 hover:bg-black/10 transition-colors"
                 >
                   <ChevronLeft size={14} />
                 </button>
                 <div className="flex flex-1 gap-2 overflow-hidden justify-center">
                   {/* Favorites first, then defaults */}
                   {[...favorites, ...ALL_WORDS.filter(w => !favorites.includes(w))].slice(startIndex, startIndex + VISIBLE_COUNT).map(word => (
                     <button
                       key={word}
                       onClick={() => handleSearch(word)}
                       disabled={isLoading}
                       className="px-2 py-1 text-[10px] uppercase font-bold border transition-all hover:-translate-y-0.5 flex items-center gap-1"
                       style={{ 
                         borderColor: favorites.includes(word) ? 'var(--accent)' : 'var(--text-primary)', 
                         background: favorites.includes(word) ? 'var(--accent)' : 'var(--surface)',
                         color: favorites.includes(word) ? 'var(--bg-primary)' : 'var(--text-primary)',
                         opacity: isLoading ? 0.5 : 1
                       }}
                       onMouseEnter={() => playSound('hover')}
                     >
                       {favorites.includes(word) && <Heart size={8} fill="currentColor" />}
                       {word}
                     </button>
                   ))}
                 </div>
                 <button 
                   onClick={() => { setStartIndex(p => Math.min(ALL_WORDS.length - VISIBLE_COUNT, p + 1)); playSound('hover'); }}
                   disabled={startIndex >= ALL_WORDS.length - VISIBLE_COUNT}
                   className="p-1 disabled:opacity-20 hover:bg-black/10 transition-colors"
                 >
                   <ChevronRight size={14} />
                 </button>
               </div>
             </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
               <div className="flex items-center gap-3">
                 <h2 className="text-3xl font-doto font-bold uppercase">{journeyData?.word}</h2>
                 {journeyData.source === 'LIVE_AI' && (
                   <span className="px-1.5 py-0.5 text-[9px] font-bold text-black bg-[#ACD8C9] animate-pulse">
                     LIVE_GEMINI_AI
                   </span>
                 )}
                 {journeyData.source !== 'LIVE_AI' && (
                   <span className="px-1.5 py-0.5 text-[9px] font-bold border border-current opacity-40">
                     ARCHIVE_DATA
                   </span>
                 )}
                 <button onClick={() => toggleFavorite(journeyData.word)} className="active:scale-95 transition-transform">
                   <Heart size={20} 
                     fill={favorites.includes(journeyData.word) ? "var(--accent)" : "none"} 
                     color={favorites.includes(journeyData.word) ? "var(--accent)" : "currentColor"} 
                   />
                 </button>
               </div>
               <div className="flex gap-2 mt-1">
                 <button onClick={() => { setJourneyData(null); setActiveWaypointIndex(-1); setIsPlaying(false); playSound('click'); }} 
                   className="text-[10px] underline hover:text-accent">
                   NEW_SEARCH
                 </button>
                 <span className="text-[10px] opacity-40">|</span>
                 <button onClick={handleShare} className="text-[10px] flex items-center gap-1 hover:text-accent">
                   <Share2 size={10} /> SHARE
                 </button>
               </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden lg:flex flex-col items-end text-[9px] font-bold opacity-40 pointer-events-none">
            <span>SYS_ID: 802405</span>
            <span>PROJ: NATURAL_EARTH</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <WorldMap 
          journeyData={journeyData} 
          activeWaypointIndex={activeWaypointIndex}
          isPanelOpen={showPanel && !!journeyData}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
               style={{ background: 'var(--bg-panel)' }}>
            <div className="w-16 h-16 mb-6 animate-spin flex items-center justify-center border-4 border-t-transparent rounded-full"
                 style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }} />
            <div className="bg-white px-6 py-3 border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
              <p className="font-bold text-xs tracking-widest animate-pulse">
                {LOADING_MESSAGES[loadingMsgIndex]}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 border shadow-lg flex items-center gap-3"
               style={{ background: 'var(--bg-panel)', borderColor: 'red', color: 'red' }}>
             <Info size={20} />
             <span className="font-bold uppercase text-xs">{error}</span>
             <button onClick={() => setError(null)} className="ml-4 underline">CLOSE</button>
          </div>
        )}

        {/* Controls & Metrics */}
        {journeyData && !isLoading && (
          <>
            <PlaybackControls 
              isPlaying={isPlaying}
              onTogglePlay={() => { setIsPlaying(p => !p); playSound('click'); }}
              onNext={handleNext}
              onPrev={handlePrev}
              onReset={() => { setActiveWaypointIndex(-1); setIsPlaying(false); playSound('click'); }}
              playbackSpeed={playbackSpeed}
              onSetSpeed={(s) => { setPlaybackSpeed(s); playSound('click'); }}
              progress={progress}
              canGoNext={activeWaypointIndex < journeyData.journey.length - 1}
              canGoPrev={activeWaypointIndex > -1}
            />
            
            <StatsBar data={journeyData} />

            {/* Info Panel toggle */}
            {!showPanel && (
              <button 
                onClick={() => { setShowPanel(true); playSound('click'); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 border shadow-lg z-20 transition-all hover:-translate-x-1"
                style={{ background: 'var(--surface)', borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {showPanel && (
              <InfoPanel 
                data={journeyData}
                onClose={() => { setShowPanel(false); playSound('click'); }}
                activeWaypointIndex={activeWaypointIndex}
              />
            )}
          </>
        )}
        
        {/* Coordinates Decorator */}
        <div className="absolute bottom-4 left-6 text-[10px] font-bold opacity-30 pointer-events-none flex gap-8">
           <span>40°N 73°W</span>
           <span>LAT: {journeyData ? 'LOCKED' : 'SCANNING...'}</span>
        </div>

        {/* Branding */}
        <div className="absolute bottom-4 right-6 text-[10px] font-bold opacity-50 pointer-events-none flex flex-col items-end leading-tight">
           <span>WANDERWORD OS v2.1</span>
           <span className="text-[9px] mt-0.5">© 2026 ARCHITECTED BY MITHUN ™</span>
        </div>
      </main>
    </div>
  )
}
