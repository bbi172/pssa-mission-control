'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import TileBackground from '@/components/TileBackground'

type Mode = 'login' | 'forgot' | 'forgot-sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState('')
  const [resetError, setResetError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [destination, setDestination] = useState('/mission')
  const router = useRouter()

  const handleTransitionComplete = useCallback(() => {
    router.push(destination)
  }, [router, destination])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Admins land on the admin hub; teachers-only accounts go straight to Mission Day
    const { data: adminRow } = await supabase.from('admins').select('id').eq('user_id', authData.user.id).maybeSingle()
    setDestination(adminRow ? '/admin' : '/mission')

    setLoading(false)
    setTransitioning(true)
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    })

    setResetLoading(false)

    if (resetErr) {
      setResetError(resetErr.message)
      return
    }

    setMode('forgot-sent')
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', boxSizing: 'border-box' as const,
    background: '#0a0e1f', border: '1px solid #232b52', borderRadius: 10,
    color: '#f2f0e8', fontSize: 15, fontFamily: "'Inter', sans-serif",
  }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: '#a7adc9', marginBottom: 8 }

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
          {mode === 'login' ? 'Sign In' : 'Reset Password'}
        </span>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
          PSSA Mission Control
        </h1>

        {mode === 'login' && (
          <>
            <p style={{ color: '#a7adc9', marginBottom: 26, fontSize: 14.5 }}>Welcome back, Mission Specialist.</p>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
              </div>

              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setResetError(''); }}
                  style={{ background: 'none', border: 'none', color: '#a7adc9', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: "'Inter', sans-serif" }}
                >
                  Forgot password?
                </button>
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
          </>
        )}

        {mode === 'forgot' && (
          <>
            <p style={{ color: '#a7adc9', marginBottom: 26, fontSize: 14.5 }}>
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={handleResetRequest}>
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required style={inputStyle} />
              </div>
              {resetError && <p style={{ color: '#f0605a', fontSize: 13.5, marginBottom: 16 }}>{resetError}</p>}
              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  width: '100%', padding: '13px 24px', cursor: resetLoading ? 'default' : 'pointer',
                  background: 'linear-gradient(135deg, #f2a65a, #c98a49)', color: '#0a0e1f',
                  border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15,
                  fontFamily: "'Inter', sans-serif", opacity: resetLoading ? 0.6 : 1, marginBottom: 14,
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setResetError(''); }}
                style={{ width: '100%', background: 'none', border: 'none', color: '#a7adc9', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: "'Inter', sans-serif" }}
              >
                Back to login
              </button>
            </form>
          </>
        )}

        {mode === 'forgot-sent' && (
          <>
            <p style={{ color: '#4fd1c5', marginBottom: 10, fontSize: 15, fontWeight: 600 }}>✅ Check your email</p>
            <p style={{ color: '#a7adc9', marginBottom: 26, fontSize: 14.5 }}>
              We sent a password reset link to <strong style={{ color: '#f2f0e8' }}>{resetEmail}</strong>. Click the link in that email to set a new password.
            </p>
            <button
              type="button"
              onClick={() => { setMode('login'); setResetEmail(''); }}
              style={{ width: '100%', background: 'none', border: '1px solid #232b52', borderRadius: 12, color: '#f2f0e8', fontSize: 14, cursor: 'pointer', padding: '12px 24px', fontFamily: "'Inter', sans-serif" }}
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
