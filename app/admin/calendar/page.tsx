'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Closure = { day_number: number; reason: string }
type School = { id: string; name: string; current_day_index: number }

export default function AdminCalendarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [role, setRole] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [currentDay, setCurrentDay] = useState(0)
  const [closures, setClosures] = useState<Closure[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin, error: adminErr } = await supabase
      .from('admins').select('role, school_id, district_id').eq('user_id', user.id).single()

    if (adminErr || !admin) {
      setError('This account is not an administrator.')
      setLoading(false)
      return
    }
    setRole(admin.role)

    let schoolList: School[] = []
    if (admin.role === 'school_admin') {
      if (!admin.school_id) { setError('This admin account is not linked to a specific school yet.'); setLoading(false); return }
      const { data: s } = await supabase.from('schools').select('id, name, current_day_index').eq('id', admin.school_id).single()
      if (s) schoolList = [s]
    } else {
      const { data: s } = await supabase.from('schools').select('id, name, current_day_index').eq('district_id', admin.district_id)
      schoolList = s || []
    }

    if (schoolList.length === 0) { setError('No schools found.'); setLoading(false); return }

    setSchools(schoolList)
    const firstId = admin.school_id || schoolList[0].id
    setSelectedSchoolId(firstId)
    await loadSchoolDetails(firstId, schoolList)
    setLoading(false)
  }

  async function loadSchoolDetails(schoolId: string, schoolList?: School[]) {
    const list = schoolList || schools
    const match = list.find(s => s.id === schoolId)
    setCurrentDay(match?.current_day_index || 0)

    const { data: closureRows } = await supabase
      .from('school_closures').select('day_number, reason').eq('school_id', schoolId).order('day_number')
    setClosures(closureRows || [])
  }

  function handleSchoolChange(id: string) {
    setSelectedSchoolId(id)
    setMessage('')
    loadSchoolDetails(id)
  }

  async function runAdvance(isClosure: boolean) {
    if (!selectedSchoolId) return
    setBusy(true)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }

    const res = await fetch('/api/advance-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: selectedSchoolId, isClosure, reason: 'School Closed', accessToken: session.access_token }),
    })
    const result = await res.json()
    setBusy(false)

    if (result.error) { setMessage(`Error: ${result.error}`); return }

    setMessage(isClosure
      ? `❄ Day ${result.newDayNumber - 1} marked closed — no penalties recorded. Now on Day ${result.newDayNumber}.`
      : `▶ Advanced to Day ${result.newDayNumber}. Any class that hadn't submitted was logged as Did Not Complete.`
    )
    load()
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  const selectedSchool = schools.find(s => s.id === selectedSchoolId)

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Section 1 · School Calendar</span>
        <h2>School Calendar</h2>

        {schools.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>School</label>
            <select value={selectedSchoolId} onChange={e => handleSchoolChange(e.target.value)}
              style={{ width: '100%', padding: 12, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 15 }}>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <p className="sub">
          <strong>{selectedSchool?.name}</strong> is currently on <strong style={{ color: 'var(--thruster)' }}>Mission Day {currentDay + 1}</strong>.
          If school is closed today, mark it below — no teacher is penalized and no data is recorded for a closed day.
        </p>

        <button className="btn btn-full" disabled={busy}
          style={{ background: 'rgba(79,209,197,.12)', border: '1px solid rgba(79,209,197,.4)', color: 'var(--thruster)', marginBottom: 10 }}
          onClick={() => runAdvance(true)}>
          ❄ Mark Today (Day {currentDay + 1}) as School Closed
        </button>

        <button className="btn btn-ghost btn-full" disabled={busy} style={{ marginBottom: 18, fontSize: 13 }}
          onClick={() => runAdvance(false)}>
          ▶ Advance to Next Day {schools.length > 1 ? '(for this school only)' : '(auto-marks incomplete classes)'}
        </button>

        {message && <p style={{ fontSize: 14, marginBottom: 18, color: 'var(--star)' }}>{message}</p>}

        <Link href="/mission" style={{ display: 'block', textAlign: 'center', marginBottom: 20, color: 'var(--thruster)', fontSize: 13.5, textDecoration: 'underline' }}>
          → Go do today&apos;s Mission Day now
        </Link>

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
