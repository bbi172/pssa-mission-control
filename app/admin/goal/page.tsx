'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AdminGoalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [goal, setGoal] = useState(75)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin, error: adminErr } = await supabase
      .from('admins')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single()

    if (adminErr || !admin) {
      setError('This account is not set up as an administrator.')
      setLoading(false)
      return
    }

    if (!admin.school_id) {
      setError('This admin account is not linked to a specific school yet.')
      setLoading(false)
      return
    }

    setSchoolId(admin.school_id)

    const { data: school, error: schoolErr } = await supabase
      .from('schools')
      .select('school_goal_pct')
      .eq('id', admin.school_id)
      .single()

    if (schoolErr || !school) {
      setError('Could not load school settings.')
      setLoading(false)
      return
    }

    setGoal(school.school_goal_pct)
    setLoading(false)
  }

  async function handleSave() {
    if (!schoolId) return
    setSaved(false)

    const { error: updateErr } = await supabase
      .from('schools')
      .update({ school_goal_pct: goal })
      .eq('id', schoolId)

    if (updateErr) {
      setError(`Could not save: ${updateErr.message}`)
      return
    }

    setSaved(true)
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Section 1 · School-Wide Goal</span>
        <h2>School Command Console</h2>
        <p className="sub">This percentage applies to every class, every grade. Changes take effect starting the next school day.</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>
            School Goal (%)
          </label>
          <input
            type="number" min={0} max={100} value={goal}
            onChange={e => { setGoal(parseInt(e.target.value) || 0); setSaved(false) }}
            style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 18 }}
          />
        </div>

        <button className="btn btn-ghost btn-full" onClick={handleSave}>
          Save Goal — Applies Starting Tomorrow
        </button>

        {saved && <p style={{ color: 'var(--thruster)', marginTop: 14, fontSize: 14 }}>✅ Saved.</p>}
      </div>
    </main>
  )
}
