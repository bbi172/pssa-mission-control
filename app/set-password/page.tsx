'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function establishSession() {
      // Manually read the tokens out of the URL instead of relying on
      // automatic detection, which isn't reliably firing.
      const hash = window.location.hash.substring(1) // strip leading #
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        const { error: sessionErr } = await supabase.auth.setSession({ access_token, refresh_token })
        if (!sessionErr) {
          setReady(true)
          return
        }
      }

      // Fallback: maybe a session already exists some other way
      const { data } = await supabase.auth.getSession()
      if (data.session) setReady(true)
    }

    establishSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) { setError(updateErr.message); return }
    router.push('/mission')
  }

  if (!ready) {
    return (
      <main className="app">
        <div className="panel">
          <h2>Setting Up Your Account...</h2>
          <p className="sub">If this doesn&apos;t finish in a few seconds, your invite link may have expired — ask your administrator to resend it.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Welcome to PSSA Mission Control</span>
        <h2>Set Your Password</h2>
        <p className="sub">Choose a password to finish setting up your account.</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 16 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 16 }} />
          </div>
          {error && <p style={{ color: 'var(--alert)', fontSize: 14, marginBottom: 14 }}>{error}</p>}
          <button className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Saving...' : 'Set Password & Continue'}</button>
        </form>
      </div>
    </main>
  )
}
