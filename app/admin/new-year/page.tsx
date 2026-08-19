'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function StartNewYearPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin, error: adminErr } = await supabase
      .from('admins').select('school_id').eq('user_id', user.id).single()

    if (adminErr || !admin || !admin.school_id) {
      setError('This admin account is not linked to a specific school yet.')
      setLoading(false)
      return
    }

    setSchoolId(admin.school_id)
    setLoading(false)
  }

  async function handleConfirmedReset() {
    if (!schoolId) return
    setRunning(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setRunning(false); return }

    const res = await fetch('/api/start-new-year', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, accessToken: session.access_token }),
    })
    const data = await res.json()
    setRunning(false)
    setConfirming(false)

    if (data.error) {
      setResult(`Error: ${data.error}`)
      return
    }

    setResult(`✅ Reset complete. ${data.sectionsReset} class(es) now start the new year at 0% / Space 0. All historical daily results are untouched and still fully intact.`)
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Admin Tools</span>
        <h2>Start New School Year</h2>
        <p className="sub">
          This resets every class&apos;s best score, game board position, and magnet count back to zero — a fresh scoreboard for the new year.
          Every past day&apos;s results stay permanently on record; nothing historical is ever deleted.
        </p>

        {!confirming && !result && (
          <button className="btn btn-primary btn-full" onClick={() => setConfirming(true)}>
            Start New School Year
          </button>
        )}

        {confirming && (
          <div>
            <div className="banner encourage" style={{ marginBottom: 16 }}>
              <span className="banner-title">⚠ ARE YOU SURE?</span>
              This immediately resets the scoreboard for every class in this school. This cannot be undone once confirmed.
            </div>
            <button className="btn btn-primary btn-full" disabled={running} onClick={handleConfirmedReset} style={{ marginBottom: 10 }}>
              {running ? 'Resetting...' : 'Yes, Reset the Scoreboard for a New Year'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        )}

        {result && <p style={{ color: 'var(--thruster)', marginTop: 14, fontSize: 14 }}>{result}</p>}
      </div>
    </main>
  )
}
