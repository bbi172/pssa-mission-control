'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function MissionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
      setHasAdminAccess(!!data)
    }
    checkAdmin()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {hasAdminAccess ? (
          <Link
            href="/admin/calendar"
            style={{
              color: 'var(--thruster)', fontSize: 12.5, fontWeight: 700,
              textDecoration: 'underline', fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            → Admin Calendar
          </Link>
        ) : <span />}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', border: '1px solid var(--panel-edge)', borderRadius: 999,
            color: 'var(--star-dim)', fontSize: 12.5, fontWeight: 600, padding: '6px 16px',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Log Out
        </button>
      </div>
      {children}
    </div>
  )
}
