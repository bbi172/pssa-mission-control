'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function MissionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
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
