'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Teacher = {
  id: string
  name: string
  grade_level: number
  substitute_enabled: boolean
}

export default function AdminSubstitutesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [error, setError] = useState('')

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

    const { data: teacherRows, error: tErr } = await supabase
      .from('teachers')
      .select('id, name, grade_level, substitute_enabled')
      .eq('school_id', admin.school_id)
      .order('grade_level')
      .order('name')

    if (tErr) {
      setError('Could not load teacher list.')
      setLoading(false)
      return
    }

    setTeachers(teacherRows || [])
    setLoading(false)
  }

  async function toggle(teacher: Teacher) {
    const newValue = !teacher.substitute_enabled

    // update on screen right away, then confirm with the database
    setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, substitute_enabled: newValue } : t))

    const { error: updateErr } = await supabase
      .from('teachers')
      .update({ substitute_enabled: newValue })
      .eq('id', teacher.id)

    if (updateErr) {
      setError(`Could not update: ${updateErr.message}`)
      // revert on failure
      setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, substitute_enabled: !newValue } : t))
    }
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Section 2 · Substitute Access</span>
        <h2>Who Can Use the Substitute Login Today</h2>
        <p className="sub">Toggle on only for teachers who need sub coverage today — this resets automatically at the end of each school day.</p>

        {teachers.length === 0 && <p className="sub">No teachers found for this school yet.</p>}

        {teachers.map(t => (
          <div key={t.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--panel-edge)', paddingBottom: 16, marginBottom: 16
          }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{t.name} <span style={{ color: 'var(--star-dim)', fontSize: 14 }}>· Grade {t.grade_level}</span></span>
            <span
              onClick={() => toggle(t)}
              style={{
                cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700,
                padding: '9px 16px', borderRadius: 999,
                background: t.substitute_enabled ? 'rgba(79,209,197,.15)' : 'rgba(167,173,201,.1)',
                color: t.substitute_enabled ? 'var(--thruster)' : 'var(--star-dim)',
                border: t.substitute_enabled ? '1px solid rgba(79,209,197,.4)' : '1px solid var(--panel-edge)',
              }}
            >
              {t.substitute_enabled ? '● SUB ENABLED' : '○ DISABLED'}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
