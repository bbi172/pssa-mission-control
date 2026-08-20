'use client'

import { useEffect, useMemo, useState } from 'react'

const STAR_COUNT = 180
const WARP_MS = 900
const HOLD_MS = 500

type Star = {
  left: number   // percent
  top: number    // percent
  size: number
  baseOpacity: number
  angleDeg: number
  twinkleDelay: number
}

export default function TileBackground({ flip, onComplete }: { flip: boolean; onComplete?: () => void }) {
  const [flashOn, setFlashOn] = useState(false)

  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      // deterministic pseudo-random spread (no Math.random, avoids hydration mismatches)
      const left = (i * 53.7) % 100
      const top = (i * 31.3 + i * i * 0.7) % 100
      const size = 1 + ((i * 7) % 3) * 0.7
      const baseOpacity = 0.35 + ((i * 13) % 60) / 100
      const dx = left - 50
      const dy = top - 50
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
      const twinkleDelay = (i % 40) * 0.1
      arr.push({ left, top, size, baseOpacity, angleDeg, twinkleDelay })
    }
    return arr
  }, [])

  useEffect(() => {
    if (!flip || !onComplete) return
    const flashTimer = setTimeout(() => setFlashOn(true), WARP_MS * 0.55)
    const doneTimer = setTimeout(onComplete, WARP_MS + HOLD_MS)
    return () => {
      clearTimeout(flashTimer)
      clearTimeout(doneTimer)
    }
  }, [flip, onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 30% 20%, #151b3e 0%, #0a0e1f 65%)',
      }}
    >
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: flip ? 2 : s.size,
            height: flip ? 2 : s.size,
            borderRadius: '50%',
            background: '#f2f0e8',
            opacity: flip ? 0.95 : s.baseOpacity,
            transformOrigin: 'left center',
            transform: flip ? `rotate(${s.angleDeg}deg) scaleX(70)` : 'rotate(0deg) scaleX(1)',
            transition: flip
              ? `transform ${WARP_MS}ms cubic-bezier(.2,.7,.3,1), opacity ${WARP_MS * 0.5}ms ease`
              : 'none',
            animation: flip ? 'none' : `twinkle 3.5s ease-in-out ${s.twinkleDelay}s infinite`,
          }}
        />
      ))}

      {/* brief white flash at the peak of the jump */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#f2f0e8',
          opacity: flashOn ? 0.85 : 0,
          transition: flashOn ? 'opacity 120ms ease-out' : `opacity ${HOLD_MS}ms ease-in`,
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--base-opacity, 0.4); }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
