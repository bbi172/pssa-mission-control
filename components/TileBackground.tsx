'use client'

import { useEffect, useMemo } from 'react'

const COLS = 16
const ROWS = 10
const STEP_MS = 14
const FLIP_MS = 550

export default function TileBackground({ flip, onComplete }: { flip: boolean; onComplete?: () => void }) {
  const tiles = useMemo(() => {
    const arr: { r: number; c: number; delay: number }[] = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        arr.push({ r, c, delay: (r + c) * STEP_MS })
      }
    }
    return arr
  }, [])

  useEffect(() => {
    if (!flip || !onComplete) return
    const maxDelay = (ROWS - 1 + COLS - 1) * STEP_MS
    const t = setTimeout(onComplete, maxDelay + FLIP_MS + 150)
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
      {tiles.map(({ r, c, delay }) => {
        const idx = r * COLS + c
        const isNebula = idx % 11 === 0
        const hasStar = idx % 5 === 0
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
              {/* front face — idle navy 3D tile */}
              <div
                style={{
                  position: 'absolute',
                  inset: 1,
                  backfaceVisibility: 'hidden',
                  background: 'linear-gradient(135deg, #1c2452, #0d1130)',
                  border: '1px solid rgba(139,111,240,0.12)',
                  borderRadius: 3,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -3px 5px rgba(0,0,0,0.45)',
                }}
              />
              {/* back face — revealed space pattern */}
              <div
                style={{
                  position: 'absolute',
                  inset: 1,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: 3,
                  background: isNebula
                    ? 'radial-gradient(circle at 40% 35%, rgba(139,111,240,0.4), #0a0e1f 70%)'
                    : '#0a0e1f',
                }}
              >
                {hasStar && (
                  <div
                    style={{
                      position: 'absolute',
                      width: 2,
                      height: 2,
                      borderRadius: '50%',
                      background: '#f2f0e8',
                      opacity: 0.65,
                      top: `${((r * 37 + c * 17) % 80) + 10}%`,
                      left: `${((r * 23 + c * 41) % 80) + 10}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
