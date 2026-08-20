'use client'

import { useEffect, useMemo } from 'react'

const COLS = 16
const ROWS = 10
const STEP_MS = 14
const FLIP_MS = 550
const HOLD_MS = 1400 // extra time to admire the finished space pattern before navigating

const NAVY_SHADES = {
  top: '#1a2148',
  right: '#141a36',
  bottom: '#0a0e1f',
  left: '#171f42',
}

const SPACE_PALETTES = [
  { bg: '#0a0e1f', glow: 'rgba(139,111,240,0.45)' },  // nebula purple
  { bg: '#0a0e1f', glow: 'rgba(79,209,197,0.4)' },     // thruster teal
  { bg: '#0a0e1f', glow: 'rgba(242,166,90,0.35)' },    // solar amber
  { bg: '#0a0e1f', glow: null },                        // plain dark, stars only
]

export default function TileBackground({ flip, onComplete }: { flip: boolean; onComplete?: () => void }) {
  const tiles = useMemo(() => {
    const arr: { r: number; c: number; delay: number; brightness: number }[] = []
    const maxDist = (ROWS - 1) + (COLS - 1)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const dist = r + c
        // top-left tiles lighter, bottom-right tiles darker
        const brightness = 1.35 - (dist / maxDist) * 0.75
        arr.push({ r, c, delay: dist * STEP_MS, brightness })
      }
    }
    return arr
  }, [])

  useEffect(() => {
    if (!flip || !onComplete) return
    const maxDelay = (ROWS - 1 + COLS - 1) * STEP_MS
    const t = setTimeout(onComplete, maxDelay + FLIP_MS + HOLD_MS)
    return () => clearTimeout(t)
  }, [flip, onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        perspective: 1200,
        background: '#0a0e1f',
      }}
    >
      {tiles.map(({ r, c, delay, brightness }) => {
        const idx = r * COLS + c
        const palette = SPACE_PALETTES[idx % SPACE_PALETTES.length]
        const starCount = idx % 3 === 0 ? 2 : idx % 2 === 0 ? 1 : 0

        return (
          <div key={idx} style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformStyle: 'preserve-3d',
                transition: `transform ${FLIP_MS}ms ease`,
                transitionDelay: flip ? `${delay}ms` : '0ms',
                transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* front face — dark, flat, 4-triangle pinwheel, lighter top-left to darker bottom-right */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0.5,
                  backfaceVisibility: 'hidden',
                  background: `conic-gradient(from 45deg, ${NAVY_SHADES.right} 0deg 90deg, ${NAVY_SHADES.bottom} 90deg 180deg, ${NAVY_SHADES.left} 180deg 270deg, ${NAVY_SHADES.top} 270deg 360deg)`,
                  filter: `brightness(${brightness})`,
                  borderRight: '1px solid rgba(0,0,0,0.3)',
                  borderBottom: '1px solid rgba(0,0,0,0.3)',
                }}
              />
              {/* back face — richer space pattern: nebula-tinted tiles + multiple colored stars */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0.5,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: palette.glow
                    ? `radial-gradient(circle at 45% 40%, ${palette.glow}, ${palette.bg} 75%)`
                    : palette.bg,
                }}
              >
                {Array.from({ length: starCount }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: i === 0 ? 2.5 : 1.5,
                      height: i === 0 ? 2.5 : 1.5,
                      borderRadius: '50%',
                      background: i === 0 ? '#f2f0e8' : palette.glow ? palette.glow.replace(/[\d.]+\)$/, '0.9)') : '#f2f0e8',
                      opacity: 0.85,
                      top: `${((r * 37 + c * 17 + i * 29) % 75) + 10}%`,
                      left: `${((r * 23 + c * 41 + i * 19) % 75) + 10}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

