import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json()
  if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })

  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: admin } = await callerClient.from('admins').select('role, school_id, district_id').eq('user_id', user.id).single()
  if (!admin) return NextResponse.json({ error: 'Not an administrator' }, { status: 403 })

  let schoolIds: string[] = []
  if (admin.role === 'school_admin') {
    if (!admin.school_id) return NextResponse.json({ error: 'Not linked to a school' }, { status: 400 })
    schoolIds = [admin.school_id]
  } else {
    const { data: schools } = await supabaseAdmin.from('schools').select('id').eq('district_id', admin.district_id)
    schoolIds = (schools || []).map(s => s.id)
  }

  const { data: sections } = await supabaseAdmin
    .from('sections')
    .select('id, label, best_pct, board_pos, laps, teacher_id, teachers(name, grade_level, user_id)')
    .in('school_id', schoolIds)

  const { data: adminRows } = await supabaseAdmin.from('admins').select('user_id')
  const adminUserIds = new Set((adminRows || []).map(a => a.user_id))

  const includeAdminLinked = admin.role !== 'school_admin' // district admin / owner get to see these, tagged
  const visibleSections = (sections || []).filter((s: any) =>
    includeAdminLinked || !adminUserIds.has(s.teachers?.user_id)
  )

  const sectionIds = visibleSections.map((s: any) => s.id)
  const { data: history } = await supabaseAdmin.from('daily_history').select('section_id, missed').in('section_id', sectionIds)

  const summaries = visibleSections.map((s: any) => {
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
      isAdminAccount: adminUserIds.has(s.teachers?.user_id),
    }
  })

  summaries.sort((a, b) => a.gradeLevel - b.gradeLevel || a.teacherName.localeCompare(b.teacherName))

  return NextResponse.json({ summaries })
}
