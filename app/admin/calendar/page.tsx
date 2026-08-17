'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Closure = { day_number: number; reason: string }

export default function AdminCalendarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [currentDay, setCurrentDay] = useState(0)
  const [closures, setClosures] = useState<Closure[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

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

    const { data: school, error: schoolErr } = await supabase
      .from('schools').select('current_day_index').eq('id', admin.school_id).single()

    if (schoolErr || !school) {
      setError('Could not load school settings.')
      setLoading(false)
      return
    }

    setCurrentDay(school.current_day_index)

    const { data: closureRows } = await supabase
      .from('school_closures').select('day_number, reason').eq('school_id', admin.school_id).order('day_number')

    setClosures(closureRows || [])
    setLoading(false)
  }

  async function runAdvance(isClosure: boolean) {
    if (!schoolId) return
    setBusy(true)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }

    const res = await fetch('/api/advance-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId,
        isClosure,
        reason: 'School Closed',
        accessToken: session.access_token,
      }),
    })
    const result = await res.json()
    setBusy(false)

    if (result.error) {
      setMessage(`Error: ${result.error}`)
      return
    }

    setMessage(isClosure
      ? `❄ Day ${result.newDayNumber - 1} marked closed — no penalties recorded. Now on Day ${result.newDayNumber}.`
      : `▶ Advanced to Day ${result.newDayNumber}. Any class that hadn't submitted was logged as Did Not Complete.`
    )
    load()
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Section 1 · School Calendar</span>
        <h2>School Calendar</h2>
        <p className="sub">
          Currently on <strong style={{ color: 'var(--thruster)' }}>Mission Day {currentDay + 1}</strong>.
          If school is closed today, mark it below — no teacher is penalized and no data is recorded for a closed day.
        </p>

        <button className="btn btn-full" disabled={busy}
          style={{ background: 'rgba(79,209,197,.12)', border: '1px solid rgba(79,209,197,.4)', color: 'var(--thruster)', marginBottom: 10 }}
          onClick={() => runAdvance(true)}>
          ❄ Mark Today (Day {currentDay + 1}) as School Closed
        </button>

        <button className="btn btn-ghost btn-full" disabled={busy} style={{ marginBottom: 18, fontSize: 13 }}
          onClick={() => runAdvance(false)}>
          ▶ Advance to Next Day (auto-marks incomplete classes)
        </button>

        {message && <p style={{ fontSize: 14, marginBottom: 18, color: 'var(--star)' }}>{message}</p>}

        <div>
          {closures.length === 0
            ? <p className="sub" style={{ fontSize: 14 }}>No school closures logged yet this year.</p>
            : closures.map(c => (
              <div key={c.day_number} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--panel-edge)' }}>
                <span>Day {c.day_number}</span>
                <span style={{ color: 'var(--nebula)' }}>❄ {c.reason}</span>
              </div>
            ))}
        </div>
      </div>
    </main>
  )
}
