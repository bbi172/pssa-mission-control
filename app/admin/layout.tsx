'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard = pathname === '/admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ animation: 'fadeInPage 550ms ease' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!isDashboard ? (
          <Link
            href="/admin"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--thruster)', fontSize: 13.5, fontWeight: 700,
              textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.03em',
            }}
          >
            ← Admin Dashboard
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
      <style>{`
        @keyframes fadeInPage {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
