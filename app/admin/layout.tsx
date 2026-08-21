'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/admin'

  return (
    <div>
      {!isDashboard && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 0' }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--thruster)',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '.03em',
            }}
          >
            ← Admin Dashboard
          </Link>
        </div>
      )}
      {children}
    </div>
  )
}
