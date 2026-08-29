import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { schoolId, gradeLevel } = await req.json()
  if (!schoolId || gradeLevel === undefined) {
    return NextResponse.json({ error: 'Missing schoolId or gradeLevel' }, { status: 400 })
  }

  const { data: gradeSections } = await supabaseAdmin
    .from('sections')
    .select('id, teachers!inner(name, grade_level, user_id)')
    .eq('school_id', schoolId)
    .eq('teachers.grade_level', gradeLevel)

  const { data: adminRows } = await supabaseAdmin.from('admins').select('user_id')
  const adminUserIds = new Set((adminRows || []).map(a => a.user_id))

  const realSections = (gradeSections || []).filter((s: any) => !adminUserIds.has(s.teachers?.user_id))

  if (realSections.length === 0) {
    return NextResponse.json({ average: null, teacherName: null })
  }

  const sectionIds = realSections.map((s: any) => s.id)
  const { data: history } = await supabaseAdmin
    .from('daily_history').select('section_id, pct').in('section_id', sectionIds).eq('missed', false)

  let topAvg = -1
  let topSectionId: string | null = null
  for (const sid of sectionIds) {
    const entries = (history || []).filter(h => h.section_id === sid && h.pct !== null)
    const avg = entries.length > 0 ? Math.round(entries.reduce((sum, h) => sum + (h.pct || 0), 0) / entries.length) : 0
    if (avg > topAvg) { topAvg = avg; topSectionId = sid }
  }

  const topSection: any = realSections.find((s: any) => s.id === topSectionId)
  return NextResponse.json({
    average: topAvg >= 0 ? topAvg : null,
    teacherName: topSection?.teachers?.name || null,
  })
}
