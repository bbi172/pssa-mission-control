import { supabaseAdmin } from './supabaseAdminClient'

export type WeeklyReportData = {
  schoolName: string
  schoolGoal: number
  weekStartDay: number
  weekEndDay: number
  totalSpacesMovedThisWeek: number
  highestPctThisWeek: number
  highestPctAllYear: number
  reactorsToRemove: number
  incompleteTeachers: { teacherName: string; gradeLevel: number; sectionLabel: string; missedDays: number[] }[]
}

// "This week" = the 5 most recently completed school days (our day counter
// only advances on real school days, so 5 days back is a solid stand-in
// for "the last calendar week" without needing real date tracking).
export async function generateWeeklyReportData(schoolId: string): Promise<WeeklyReportData> {
  const { data: school, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .select('name, school_goal_pct, current_day_index')
    .eq('id', schoolId)
    .single()

  if (schoolErr || !school) throw new Error('School not found')

  const weekEndDay = school.current_day_index
  const weekStartDay = Math.max(1, weekEndDay - 4)

  const { data: sections, error: secErr } = await supabaseAdmin
    .from('sections')
    .select('id, label, best_pct, laps, teacher_id, teachers(name, grade_level)')
    .eq('school_id', schoolId)

  if (secErr || !sections) throw new Error('Could not load sections')

  const sectionIds = sections.map(s => s.id)

  const { data: weekHistory } = await supabaseAdmin
    .from('daily_history')
    .select('section_id, day_number, pct, moved, missed')
    .in('section_id', sectionIds)
    .gte('day_number', weekStartDay)
    .lte('day_number', weekEndDay)

  const history = weekHistory || []

  const totalSpacesMovedThisWeek = history.filter(h => h.moved).length
  const highestPctThisWeek = history.reduce((max, h) => Math.max(max, h.pct || 0), 0)
  const { data: allHistory } = await supabaseAdmin
    .from('daily_history')
    .select('pct')
    .in('section_id', sectionIds)

  const highestPctAllYear = (allHistory || []).reduce((max, h) => Math.max(max, h.pct || 0), 0)
  const reactorsToRemove = sections.reduce((sum: number, s: any) => sum + (s.laps || 0), 0)

  const daysInRange: number[] = []
  for (let d = weekStartDay; d <= weekEndDay; d++) daysInRange.push(d)

  const incompleteTeachers: WeeklyReportData['incompleteTeachers'] = []
  for (const s of sections as any[]) {
    const sectionHistory = history.filter(h => h.section_id === s.id)
    const missedDays = daysInRange.filter(d => {
      const entry = sectionHistory.find(h => h.day_number === d)
      return !entry || entry.missed
    })
    if (missedDays.length > 0) {
      incompleteTeachers.push({
        teacherName: s.teachers?.name || 'Unknown',
        gradeLevel: s.teachers?.grade_level ?? 0,
        sectionLabel: s.label,
        missedDays,
      })
    }
  }

  return {
    schoolName: school.name,
    schoolGoal: school.school_goal_pct,
    weekStartDay,
    weekEndDay,
    totalSpacesMovedThisWeek,
    highestPctThisWeek,
    highestPctAllYear,
    reactorsToRemove,
    incompleteTeachers,
  }
}
