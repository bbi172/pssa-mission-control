'use client'

import { useEffect, useMemo, useState } from 'react'

const STAR_COUNT = 180
const FAST_TWINKLE_MS = 1400

type Star = {
  left: number
  top: number
  size: number
  baseOpacity: number
  twinkleDelay: number
}

export default function TileBackground({ flip, onComplete }: { flip: boolean; onComplete?: () => void }) {
  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const left = (i * 53.7) % 100
      const top = (i * 31.3 + i * i * 0.7) % 100
      const size = 1 + ((i * 7) % 3) * 0.7
      const baseOpacity = 0.35 + ((i * 13) % 60) / 100
      const twinkleDelay = (i % 40) * 0.1
      arr.push({ left, top, size, baseOpacity, twinkleDelay })
    }
    return arr
  }, [])

  useEffect(() => {
    if (!flip || !onComplete) return
    const t = setTimeout(onComplete, FAST_TWINKLE_MS)
    return () => clearTimeout(t)
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
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#f2f0e8',
            animation: flip
              ? `fastTwinkle 0.4s ease-in-out ${(i % 10) * 0.03}s infinite`
              : `twinkle 3.5s ease-in-out ${s.twinkleDelay}s infinite`,
            opacity: s.baseOpacity,
          }}
        />
      ))}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes fastTwinkle {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
