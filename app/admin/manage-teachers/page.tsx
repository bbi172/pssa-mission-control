'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Teacher = { id: string; name: string; email: string; grade_level: number; school_id: string }

export default function ManageTeachersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin } = await supabase.from('admins').select('role, school_id, district_id').eq('user_id', user.id).single()
    if (!admin) { setError('This account is not an administrator.'); setLoading(false); return }

    let query = supabase.from('teachers').select('id, name, email, grade_level, school_id')

    if (admin.role === 'school_admin') {
      if (!admin.school_id) { setError('This admin account is not linked to a school yet.'); setLoading(false); return }
      query = query.eq('school_id', admin.school_id)
    } else {
      // owner / district_admin — show every teacher at every school in their district
      const { data: schools } = await supabase.from('schools').select('id').eq('district_id', admin.district_id)
      const schoolIds = (schools || []).map(s => s.id)
      query = query.in('school_id', schoolIds)
    }

    const { data: teacherRows, error: tErr } = await query.order('grade_level').order('name')
    if (tErr) { setError('Could not load teachers.'); setLoading(false); return }

    setTeachers(teacherRows || [])
    setLoading(false)
  }

  async function handleDelete(teacherId: string) {
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }

    const res = await fetch('/api/delete-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, accessToken: session.access_token }),
    })
    const data = await res.json()
    setBusy(false)
    setConfirmingId(null)

    if (data.error) { setResult(`Error: ${data.error}`); return }
    setResult('✅ Teacher removed.')
    load()
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Admin Tools</span>
        <h2>Manage Teachers</h2>
        <p className="sub">Remove a teacher who has left — this deletes their class(es) and login. This cannot be undone.</p>

        {result && <p style={{ fontSize: 14, marginBottom: 16, color: 'var(--star)' }}>{result}</p>}

        {teachers.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--panel-edge)' }}>
            <span style={{ fontSize: 15 }}>{t.name} <span style={{ color: 'var(--star-dim)', fontSize: 13 }}>· Grade {t.grade_level} · {t.email}</span></span>
            {confirmingId === t.id ? (
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12, background: 'rgba(240,96,90,0.15)', borderColor: 'var(--alert)', color: 'var(--alert)' }} disabled={busy} onClick={() => handleDelete(t.id)}>
                  {busy ? '...' : 'Confirm Delete'}
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setConfirmingId(null)}>Cancel</button>
              </span>
            ) : (
              <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setConfirmingId(t.id)}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
