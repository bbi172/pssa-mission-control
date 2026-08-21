'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type AdminInfo = { name: string; role: string; schoolId: string | null }

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  district_admin: 'District Administrator',
  school_admin: 'School Administrator',
}

export default function AdminHomePage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase.from('admins').select('name, role, school_id').eq('user_id', user.id).single()

    if (!data) {
      router.push('/mission')
      return
    }

    setAdmin({ name: data.name, role: data.role, schoolId: data.school_id })
    setLoading(false)
  }

  if (loading || !admin) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>

  const canManageDistrict = admin.role === 'owner' || admin.role === 'district_admin'
  const isOwner = admin.role === 'owner'

  const everyoneTools = [
    { href: '/admin/goal', title: 'School Goal', desc: 'Set the school-wide percentage every class is aiming for.' },
    { href: '/admin/calendar', title: 'School Calendar', desc: 'Mark school closures, or manually advance the day if needed.' },
    { href: '/admin/substitutes', title: 'Substitute Access', desc: 'Turn on substitute login access for a teacher, for today only.' },
    { href: '/admin/log', title: 'Mission Log', desc: "See every class's participation, scores, and progress." },
    { href: '/admin/roster', title: 'Upload Teacher Roster', desc: 'Bulk-add teachers from a spreadsheet — sends invite emails automatically.' },
    { href: '/admin/manage-teachers', title: 'Manage Teachers', desc: 'Remove a teacher who has left the school.' },
  ]

  const districtTools = [
    { href: '/admin/send-report', title: 'Send Weekly Report', desc: "Send this week's PDF report to administrators right now." },
    { href: '/admin/new-year', title: 'Start New Year', desc: "Reset every class's scoreboard for a fresh school year." },
    { href: '/admin/manage-admins', title: 'Manage Administrators', desc: 'Add or remove School Administrators and District Administrators.' },
  ]

  const ownerTools = [
    { href: '/admin/videos', title: 'Upload Videos', desc: 'Attach explainer videos to questions by filename.' },
    { href: '/admin/questions', title: 'Upload Question Bank', desc: 'Bulk-load the question spreadsheet for every grade.' },
  ]

  function ToolGrid({ tools, tint }: { tools: typeof everyoneTools; tint?: boolean }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {tools.map(t => (
          <Link key={t.href} href={t.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: tint ? 'rgba(122,31,43,0.08)' : 'var(--void)',
              border: tint ? '1px solid rgba(122,31,43,0.3)' : '1px solid var(--panel-edge)',
              borderRadius: 12, padding: 18, height: '100%',
            }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--star)', marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--star-dim)', lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">{ROLE_LABELS[admin.role] || admin.role}</span>
        <h2>Welcome, {admin.name}</h2>
        <p className="sub">Everything you can manage from here.</p>

        <ToolGrid tools={everyoneTools} />

        {canManageDistrict && (
          <>
            <span className="eyebrow" style={{ display: 'block', marginTop: 32, marginBottom: 10 }}>District-Level Only</span>
            <ToolGrid tools={districtTools} tint />
          </>
        )}

        {isOwner && (
          <>
            <span className="eyebrow" style={{ display: 'block', marginTop: 32, marginBottom: 10 }}>Owner Only</span>
            <ToolGrid tools={ownerTools} tint />
          </>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--panel-edge)' }}>
          <Link href="/mission" style={{ color: 'var(--thruster)', fontSize: 13.5, textDecoration: 'underline' }}>
            → Go to the teacher Mission Day screen instead
          </Link>
        </div>
      </div>
    </main>
  )
}
