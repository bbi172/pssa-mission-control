'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type SectionSummary = {
  sectionId: string
  teacherName: string
  gradeLevel: number
  label: string
  bestPct: number
  boardPos: number
  laps: number
  completedCount: number
  missedCount: number
}

export default function AdminLogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<SectionSummary[]>([])
  const [currentDay, setCurrentDay] = useState(0)

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

    const { data: school } = await supabase
      .from('schools').select('current_day_index').eq('id', admin.school_id).single()
    setCurrentDay(school?.current_day_index || 0)

    const { data: sections, error: secErr } = await supabase
      .from('sections')
      .select('id, label, best_pct, board_pos, laps, teacher_id, teachers(name, grade_level)')
      .eq('school_id', admin.school_id)

    if (secErr || !sections) {
      setError('Could not load class list.')
      setLoading(false)
      return
    }

    const { data: history } = await supabase
      .from('daily_history')
      .select('section_id, missed')
      .in('section_id', sections.map(s => s.id))

    const summaries: SectionSummary[] = sections.map((s: any) => {
      const sectionHistory = (history || []).filter(h => h.section_id === s.id)
      return {
        sectionId: s.id,
        teacherName: s.teachers?.name || 'Unknown',
        gradeLevel: s.teachers?.grade_level ?? 0,
        label: s.label,
        bestPct: s.best_pct,
        boardPos: s.board_pos,
        laps: s.laps,
        completedCount: sectionHistory.filter(h => !h.missed).length,
        missedCount: sectionHistory.filter(h => h.missed).length,
      }
    })

    summaries.sort((a, b) => a.gradeLevel - b.gradeLevel || a.teacherName.localeCompare(b.teacherName))
    setRows(summaries)
    setLoading(false)
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><h2>{error}</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Section 4 · Mission Log</span>
        <h2>Participation &amp; Progress Report</h2>
        <p className="sub">School is on Mission Day {currentDay + 1}. This covers every class, year-to-date.</p>

        {rows.length === 0 && <p className="sub">No classes found for this school yet.</p>}

        {rows.map(r => (
          <div key={r.sectionId} style={{
            borderBottom: '1px solid var(--panel-edge)', paddingBottom: 18, marginBottom: 18,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {r.teacherName} <span style={{ color: 'var(--star-dim)', fontSize: 14, fontWeight: 500 }}>· Grade {r.gradeLevel}{r.label !== 'All Day' ? ` · ${r.label}` : ''}</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
              <span style={{ color: 'var(--thruster)' }}>Best: {r.bestPct}%</span>
              <span style={{ color: 'var(--star)' }}>Completed: {r.completedCount} days</span>
              <span style={{ color: r.missedCount > 0 ? 'var(--alert)' : 'var(--star-dim)' }}>
                Missed: {r.missedCount} day{r.missedCount === 1 ? '' : 's'}
              </span>
              <span style={{ color: 'var(--star-dim)' }}>Board: Space {r.boardPos}/31</span>
              <span style={{ color: 'var(--nebula)' }}>Mission Control Visits: {r.laps}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
