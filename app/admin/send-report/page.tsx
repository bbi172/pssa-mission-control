'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SendReportPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: admin, error: adminErr } = await supabase.from('admins').select('school_id').eq('user_id', user.id).single()
    if (adminErr || !admin || !admin.school_id) {
      setError('This admin account is not linked to a specific school yet.')
      setLoading(false)
      return
    }
    setSchoolId(admin.school_id)
    setLoading(false)
  }

  async function handleSend() {
    if (!schoolId) return
    setSending(true)
    setResult('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSending(false); return }

    const res = await fetch('/api/send-report-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, accessToken: session.access_token }),
    })
    const data = await res.json()
    setSending(false)

    if (data.error) {
      setResult(`Error: ${data.error}`)
      return
    }
    if (!data.sent) {
      setResult(`⚠ ${data.reason}`)
      return
    }
    setResult(`✅ Sent to ${data.recipientCount} administrator(s). Highest score this week: ${data.reportData.highestPctThisWeek}%.`)
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Admin Tools</span>
        <h2>Send Weekly Report Now</h2>
        <p className="sub">
          Normally this sends automatically every Friday night. Use this button to test it or send an extra copy right now — it goes to every administrator marked to receive it.
        </p>
        <button className="btn btn-primary btn-full" disabled={sending} onClick={handleSend}>
          {sending ? 'Generating & Sending...' : 'Send This Week\'s Report Now'}
        </button>
        {result && <p style={{ marginTop: 16, fontSize: 14, color: 'var(--star)' }}>{result}</p>}
      </div>
    </main>
  )
}
