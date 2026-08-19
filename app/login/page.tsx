'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import TileBackground from '@/components/TileBackground'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const router = useRouter()

  const handleTransitionComplete = useCallback(() => {
    router.push('/mission')
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setTransitioning(true)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <TileBackground flip={transitioning} onComplete={handleTransitionComplete} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 400,
          width: '100%',
          margin: '0 20px',
          padding: 36,
          background: 'linear-gradient(180deg, rgba(20,26,54,0.92), rgba(16,21,44,0.92))',
          border: '1px solid #232b52',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          fontFamily: "'Inter', sans-serif",
          color: '#f2f0e8',
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 500ms ease',
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4fd1c5', display: 'block', marginBottom: 10 }}>
          Sign In
        </span>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
          PSSA Mission Control
        </h1>
        <p style={{ color: '#a7adc9', marginBottom: 26, fontSize: 14.5 }}>Welcome back, Mission Specialist.</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#a7adc9', marginBottom: 8 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', boxSizing: 'border-box',
                background: '#0a0e1f', border: '1px solid #232b52', borderRadius: 10,
                color: '#f2f0e8', fontSize: 15, fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#a7adc9', marginBottom: 8 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', boxSizing: 'border-box',
                background: '#0a0e1f', border: '1px solid #232b52', borderRadius: 10,
                color: '#f2f0e8', fontSize: 15, fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>
          {error && <p style={{ color: '#f0605a', fontSize: 13.5, marginBottom: 16 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || transitioning}
            style={{
              width: '100%', padding: '13px 24px', cursor: loading ? 'default' : 'pointer',
              background: 'linear-gradient(135deg, #f2a65a, #c98a49)', color: '#0a0e1f',
              border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15,
              fontFamily: "'Inter', sans-serif", opacity: loading || transitioning ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in...' : transitioning ? 'Launching...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  )
}
