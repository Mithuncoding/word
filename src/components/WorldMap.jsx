import React, { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { motion, AnimatePresence } from 'framer-motion'

const getFlag = (cc) => {
  if (!cc || cc.length !== 2) return ''
  return cc.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

export default function WorldMap({ journeyData, activeWaypointIndex, isPanelOpen, isMobileExpanded }) {
  const svgRef = useRef(null)
  const zoomContainerRef = useRef(null)
  const baseMapRef = useRef(null)
  const zoomRef = useRef(null)
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { w, h } = dims
  const panelW = 420
  const effectiveW = isPanelOpen ? w - panelW : w

  const projection = useMemo(() => {
    // Mobile adjustment: 
    // If panel is Open but NOT Expanded (25% height), map has 75% space. Center in top 75% (approx 37.5%).
    // If panel is Expanded (75% height), map has 25% space. Center in top 25% (approx 12.5%).
    
    let translateY = h / 2.2 // Default desktop/full centering (approx 45%)

    if (w < 768 && isPanelOpen) {
      if (isMobileExpanded) {
        // Panel covers 75%, leaving top 25%. Center map in top 25%.
        translateY = h * 0.2 
      } else {
        // Panel covers 25%, leaving top 75%. Center map in top 75%.
        // Standard h/2.2 (45%) is actually close to 37.5%, but let's nudge it slightly up to be perfect.
        translateY = h * 0.4
      }
    }

    return d3.geoNaturalEarth1()
      .scale(w / 4.5) // Slightly larger scale for mobile impact? or keep 5.5
      .translate([w / 2, translateY])
  }, [w, h, isPanelOpen, isMobileExpanded])
  const pathGen = d3.geoPath().projection(projection)

  // Init base map
  useEffect(() => {
    if (!svgRef.current || !zoomContainerRef.current || !baseMapRef.current) return

    const svg = d3.select(svgRef.current)
    const zoomG = d3.select(zoomContainerRef.current)
    const baseG = d3.select(baseMapRef.current)

    baseG.selectAll('*').remove()

    const zoom = d3.zoom()
      .scaleExtent([1, 15])
      .on('zoom', (e) => zoomG.attr('transform', e.transform))
    svg.call(zoom)
    zoomRef.current = zoom

    // Graticule
    const grat = d3.geoGraticule().step([15, 15])
    baseG.append('path')
      .datum(grat)
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', 'var(--text-primary)')
      .attr('stroke-width', 0.2)
      .attr('stroke-opacity', 0.15)

    // Countries
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => {
        const countries = topojson.feature(topo, topo.objects.countries).features
        baseG.selectAll('.country')
          .data(countries)
          .enter()
          .append('path')
          .attr('d', pathGen)
          .attr('fill', 'var(--map-land)')
          .attr('stroke', 'var(--text-primary)')
          .attr('stroke-width', 0.8) // Thicker borders
          .attr('opacity', 0.6) // Slightly more opaque
      })
  }, [pathGen])

  // Pan to active waypoint
  useEffect(() => {
    if (!journeyData || !svgRef.current || !zoomRef.current) return

    let coords
    if (activeWaypointIndex === -1) {
      coords = journeyData.origin.location.coordinates
    } else if (journeyData.journey[activeWaypointIndex]) {
      coords = journeyData.journey[activeWaypointIndex].location.coordinates
    } else return

    const proj = projection(coords)
    if (!proj) return
    const [tx, ty] = proj
    const scale = 3.2
    let cx = effectiveW / 2
    let cy = h / 2
    
    // Mobile Offset for Zoom
    if (w < 768 && isPanelOpen) {
       if (isMobileExpanded) {
         cy = h * 0.2 // Zoom into top 25%
       } else {
         cy = h * 0.4 // Zoom into top 75%
       }
    }

    d3.select(svgRef.current).transition()
      .duration(1500)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform,
        d3.zoomIdentity.translate(cx, cy).scale(scale).translate(-tx, -ty)
      )
  }, [journeyData, activeWaypointIndex, effectiveW, h, projection, w, isPanelOpen, isMobileExpanded])

  const renderJourney = () => {
    if (!journeyData) return null
    const pts = [
      journeyData.origin.location.coordinates,
      ...journeyData.journey.map(j => j.location.coordinates)
    ]

    return (
      <g>
        <OriginMarker
          pos={projection(journeyData.origin.location.coordinates)}
          active={activeWaypointIndex >= -1}
          cc={journeyData.origin.location.countryCode}
          label={journeyData.origin.word}
          isOrigin={activeWaypointIndex === -1}
        />
        {journeyData.journey.map((step, idx) => {
          const isLand = step.routeType === 'land'
          const isActive = idx <= activeWaypointIndex
          const isCurrent = idx === activeWaypointIndex
          const pStart = projection(pts[idx])
          const pEnd = projection(pts[idx + 1])
          if (!pStart || !pEnd) return null

          const dist = Math.sqrt(Math.pow(pEnd[0] - pStart[0], 2) + Math.pow(pEnd[1] - pStart[1], 2))
          const midX = (pStart[0] + pEnd[0]) / 2
          const midY = (pStart[1] + pEnd[1]) / 2 - dist * 0.4
          const pathD = `M${pStart[0]},${pStart[1]} Q${midX},${midY} ${pEnd[0]},${pEnd[1]}`

          return (
            <g key={`step-${idx}`}>
              <motion.path
                d={pathD}
                fill="none"
                stroke="var(--text-primary)"
                strokeWidth={2}
                strokeDasharray={isLand ? "4 3" : "0"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                transition={{ duration: 1.5, ease: "linear" }}
              />
              <WaypointMarker
                pos={pEnd}
                active={isActive}
                isCurrent={isCurrent}
                label={step.word}
                cc={step.location.countryCode}
              />
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden" style={{ background: 'var(--map-bg)' }}>
      <svg ref={svgRef} width={w} height={h} className="cursor-grab active:cursor-grabbing">
        <g ref={zoomContainerRef}>
          <g ref={baseMapRef} />
          {renderJourney()}
        </g>
      </svg>
    </div>
  )
}

function OriginMarker({ pos, active, cc, label, isOrigin }) {
  if (!pos) return null
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
    >
      {/* Pulse ring */}
      <circle cx={pos[0]} cy={pos[1]} r={6} fill="none" stroke="var(--accent)" strokeWidth={1}>
        <animate attributeName="r" values="6;18" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={pos[0]} cy={pos[1]} r={6} fill="white" stroke="var(--text-primary)" strokeWidth={2} />
      {/* Crosshair */}
      <motion.g animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        <line x1={pos[0] - 4} y1={pos[1] - 4} x2={pos[0] + 4} y2={pos[1] + 4} stroke="var(--text-primary)" strokeWidth={1.5} />
        <line x1={pos[0] + 4} y1={pos[1] - 4} x2={pos[0] - 4} y2={pos[1] + 4} stroke="var(--text-primary)" strokeWidth={1.5} />
      </motion.g>
      <AnimatePresence>
        {isOrigin && (
          <motion.g initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <foreignObject x={pos[0] - 315} y={pos[1] - 10} width="300" height="20">
              <div className="flex justify-end items-center h-full">
                <div className="px-2 py-0 text-[12px] font-bold font-mono uppercase whitespace-nowrap leading-tight h-[20px] flex items-center"
                  style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
                  {getFlag(cc)} {label}
                </div>
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  )
}

function WaypointMarker({ pos, active, isCurrent, label, cc }) {
  if (!pos) return null
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
    >
      {isCurrent ? (
        <g>
          <rect x={pos[0] - 4} y={pos[1] - 4} width={8} height={8} fill="var(--accent)" />
          <line x1={pos[0] - 5} y1={pos[1] - 5} x2={pos[0] + 5} y2={pos[1] + 5} stroke="var(--bg-primary)" strokeWidth={1} />
          <line x1={pos[0] + 5} y1={pos[1] - 5} x2={pos[0] - 5} y2={pos[1] + 5} stroke="var(--bg-primary)" strokeWidth={1} />
        </g>
      ) : (
        <circle cx={pos[0]} cy={pos[1]} r={3.5} fill="var(--accent)" />
      )}
      <AnimatePresence>
        {isCurrent && (
          <motion.g initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <foreignObject x={pos[0] - 315} y={pos[1] - 10} width="300" height="20">
              <div className="flex justify-end items-center h-full">
                <div className="px-2 py-0 text-[12px] font-bold font-mono uppercase whitespace-nowrap leading-tight h-[20px] flex items-center"
                  style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
                  {getFlag(cc)} {label}
                </div>
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  )
}
