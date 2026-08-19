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
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    async function establishSession() {
      const rawHash = window.location.hash
      const hash = rawHash.substring(1)
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      let log = `Raw URL hash length: ${rawHash.length}\n`
      log += `Raw URL hash (first 60 chars): ${rawHash.substring(0, 60)}...\n`
      log += `access_token found: ${access_token ? 'YES (' + access_token.substring(0, 20) + '...)' : 'NO'}\n`
      log += `refresh_token found: ${refresh_token ? 'YES' : 'NO'}\n`

      if (access_token && refresh_token) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({ access_token, refresh_token })
        log += `setSession error: ${sessionErr ? JSON.stringify(sessionErr) : 'none'}\n`
        log += `setSession returned a session: ${sessionData?.session ? 'YES' : 'NO'}\n`
        if (!sessionErr && sessionData?.session) {
          setDebugInfo(log)
          setReady(true)
          return
        }
      }

      const { data: fallbackData, error: fallbackErr } = await supabase.auth.getSession()
      log += `Fallback getSession error: ${fallbackErr ? JSON.stringify(fallbackErr) : 'none'}\n`
      log += `Fallback getSession found a session: ${fallbackData?.session ? 'YES' : 'NO'}\n`

      setDebugInfo(log)
      if (fallbackData?.session) setReady(true)
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
          {debugInfo && (
            <pre style={{ marginTop: 20, background: 'var(--void)', padding: 16, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--star)' }}>
              {debugInfo}
            </pre>
          )}
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
