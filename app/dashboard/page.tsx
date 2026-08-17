'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [status, setStatus] = useState('Checking your account...')
  const [debugInfo, setDebugInfo] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (teacher) {
        setStatus(`Welcome, ${teacher.name}! You're logged in as a Grade ${teacher.grade_level} teacher.`)
        return
      }

      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (admin) {
        setStatus(`Welcome, ${admin.name}! You're logged in as ${admin.role}.`)
        return
      }

      setStatus(
        `You're logged in as ${user.email}, but no teacher or admin record is linked to this account yet.`
      )

      // Show the RAW error text so we can see exactly what's happening
      setDebugInfo(
        `DEBUG INFO (temporary):\n` +
        `Your user ID: ${user.id}\n\n` +
        `Teacher lookup error: ${teacherError ? JSON.stringify(teacherError, null, 2) : 'none'}\n\n` +
        `Admin lookup error: ${adminError ? JSON.stringify(adminError, null, 2) : 'none'}`
      )
    }

    checkUser()
  }, [router])

  return (
    <main style={{ maxWidth: 700, margin: '80px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>Dashboard (Test Checkpoint)</h1>
      <p style={{ marginTop: 16 }}>{status}</p>
      {debugInfo && (
        <pre style={{
          marginTop: 24,
          background: '#f4f4f4',
          padding: 16,
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {debugInfo}
        </pre>
      )}
    </main>
  )
}
