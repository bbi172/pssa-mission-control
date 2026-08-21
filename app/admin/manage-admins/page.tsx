'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type School = { id: string; name: string }
type Admin = { email: string; name: string; role: string; school_id: string | null }

const ROLE_LABELS: Record<string, string> = {
  district_admin: 'District Administrator',
  school_admin: 'School Administrator',
  principal: 'Principal',
}

export default function ManageAdminsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('principal')
  const [schoolId, setSchoolId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin } = await supabase.from('admins').select('role, district_id').eq('user_id', user.id).single()

    if (!admin || admin.role !== 'district_admin') {
      setAuthorized(false)
      return
    }
    setAuthorized(true)

    const { data: schoolRows } = await supabase.from('schools').select('id, name').eq('district_id', admin.district_id)
    setSchools(schoolRows || [])
    if (schoolRows && schoolRows.length > 0) setSchoolId(schoolRows[0].id)

    const { data: adminRows } = await supabase.from('admins').select('email, name, role, school_id').eq('district_id', admin.district_id)
    setAdmins(adminRows || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSubmitting(false); return }

    const res = await fetch('/api/add-administrator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, role,
        schoolId: role === 'district_admin' ? null : schoolId,
        accessToken: session.access_token,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (data.error) {
      setResult(`Error: ${data.error}`)
      return
    }

    setResult(data.invited
      ? `✅ ${name} was added as ${ROLE_LABELS[role]} and emailed a link to set their password.`
      : `✅ ${name} was added as ${ROLE_LABELS[role]}. They already had an account, so no new invite email was needed.`
    )
    setName(''); setEmail('')
    load()
  }

  if (authorized === null) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Checking access...</p></main>
  if (authorized === false) return <main className="app"><div className="panel"><h2>Not Authorized</h2><p className="sub">This page is only available to the District Administrator.</p></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">District Tools</span>
        <h2>Add an Administrator</h2>
        <p className="sub">Add a School Administrator, Principal, or another District Administrator. They&apos;ll be emailed a link to set their own password.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 16 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 16 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 16 }}>
              <option value="principal">Principal</option>
              <option value="school_admin">School Administrator</option>
              <option value="district_admin">District Administrator</option>
            </select>
          </div>

          {role !== 'district_admin' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--star-dim)', marginBottom: 8 }}>School</label>
              <select value={schoolId} onChange={e => setSchoolId(e.target.value)}
                style={{ width: '100%', padding: 14, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, color: 'var(--star)', fontSize: 16 }}>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <button className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Administrator'}
          </button>
        </form>

        {result && <p style={{ marginTop: 16, fontSize: 14, color: 'var(--star)' }}>{result}</p>}

        <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 14 }}>Current Administrators</h2>
        {admins.map((a, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--panel-edge)', fontSize: 14 }}>
            <span>{a.name} <span style={{ color: 'var(--star-dim)' }}>({a.email})</span></span>
            <span style={{ color: 'var(--thruster)' }}>{ROLE_LABELS[a.role] || a.role}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
