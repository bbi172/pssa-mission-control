'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type SectionSummary = {
  sectionId: string
  teacherName: string
  gradeLevel: number
  label: string
  bestPct: number
  boardPos: number
  laps: number
  completedCount: number
  missedCount: number
  isAdminAccount: boolean
}

export default function AdminLogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<SectionSummary[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const res = await fetch('/api/mission-log-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: session.access_token }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    setRows(data.summaries || [])
    setLoading(false)
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Section 4 · Mission Log</span>
        <h2>Participation &amp; Progress Report</h2>
        <p className="sub">Year-to-date, every real class. Admin accounts used for testing are hidden from this view for School Administrators, and clearly marked for District Administrators.</p>

        {rows.length === 0 && <p className="sub">No classes found.</p>}

        {rows.map(r => (
          <div key={r.sectionId} style={{
            borderBottom: '1px solid var(--panel-edge)', paddingBottom: 18, marginBottom: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {r.teacherName} <span style={{ color: 'var(--star-dim)', fontSize: 14, fontWeight: 500 }}>· Grade {r.gradeLevel}{r.label !== 'All Day' ? ` · ${r.label}` : ''}</span>
                {r.isAdminAccount && <span style={{ color: 'var(--maroon, var(--alert))', fontSize: 12, marginLeft: 10, fontFamily: "'JetBrains Mono', monospace" }}>(Admin Account)</span>}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
              <span style={{ color: 'var(--thruster)' }}>Best: {r.bestPct}%</span>
              <span style={{ color: 'var(--star)' }}>Completed: {r.completedCount} days</span>
              <span style={{ color: r.missedCount > 0 ? 'var(--alert)' : 'var(--star-dim)' }}>
                Missed: {r.missedCount} day{r.missedCount === 1 ? '' : 's'}
              </span>
              <span style={{ color: 'var(--star-dim)' }}>Board: Space {r.boardPos}/31</span>
              <span style={{ color: 'var(--nebula)' }}>Mission Control Visits: {r.laps}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
