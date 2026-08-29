import { supabaseAdmin } from './supabaseAdminClient'

export type WeeklyReportData = {
  schoolName: string
  schoolGoal: number
  weekStartDay: number
  weekEndDay: number
  totalSpacesMovedThisWeek: number
  highestPctThisWeek: number
  averagePctThisWeek: number
  highestPctAllYear: number
  reactorsToRemove: number
  totalClassrooms: number
  classroomsMeetingGoalThisWeek: number
  possibleSubmissions: number
  actualSubmissions: number
  participationRate: number
  topPerformerByGrade: { gradeLevel: number; teacherName: string; sectionLabel: string; average: number }[]
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

  const scoredEntriesThisWeek = history.filter(h => !h.missed && h.pct !== null)
  const averagePctThisWeek = scoredEntriesThisWeek.length > 0
    ? Math.round(scoredEntriesThisWeek.reduce((sum, h) => sum + (h.pct || 0), 0) / scoredEntriesThisWeek.length)
    : 0

  const { data: allHistory } = await supabaseAdmin
    .from('daily_history')
    .select('section_id, pct')
    .in('section_id', sectionIds)

  const highestPctAllYear = (allHistory || []).reduce((max, h) => Math.max(max, h.pct || 0), 0)
  const reactorsToRemove = sections.reduce((sum: number, s: any) => sum + (s.laps || 0), 0)

  const totalClassrooms = sections.length

  // Highest year-to-date average, per grade level — shown regardless of
  // whether Competition Mode is turned on for teachers, since this report
  // is principal-facing and already names teachers elsewhere.
  const gradeLevels = Array.from(new Set((sections as any[]).map(s => s.teachers?.grade_level).filter(g => g !== undefined)))
  const topPerformerByGrade: WeeklyReportData['topPerformerByGrade'] = []
  for (const gl of gradeLevels) {
    const sectionsInGrade = (sections as any[]).filter(s => s.teachers?.grade_level === gl)
    let topAvg = -1
    let topSection: any = null
    for (const s of sectionsInGrade) {
      const entries = (allHistory || []).filter(h => h.section_id === s.id && h.pct !== null)
      const avg = entries.length > 0 ? Math.round(entries.reduce((sum, h) => sum + (h.pct || 0), 0) / entries.length) : 0
      if (avg > topAvg) { topAvg = avg; topSection = s }
    }
    if (topSection) {
      topPerformerByGrade.push({
        gradeLevel: gl,
        teacherName: topSection.teachers?.name || 'Unknown',
        sectionLabel: topSection.label,
        average: topAvg,
      })
    }
  }
  topPerformerByGrade.sort((a, b) => a.gradeLevel - b.gradeLevel)

  const daysInRange: number[] = []
  for (let d = weekStartDay; d <= weekEndDay; d++) daysInRange.push(d)

  const possibleSubmissions = totalClassrooms * daysInRange.length
  const actualSubmissions = scoredEntriesThisWeek.length
  const participationRate = possibleSubmissions > 0 ? Math.round((actualSubmissions / possibleSubmissions) * 100) : 0

  // How many distinct classrooms hit the goal on at least one day this week
  const classroomsMeetingGoalThisWeek = new Set(
    history.filter(h => !h.missed && (h.pct || 0) >= school.school_goal_pct).map(h => h.section_id)
  ).size

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
    averagePctThisWeek,
    highestPctAllYear,
    reactorsToRemove,
    totalClassrooms,
    classroomsMeetingGoalThisWeek,
    possibleSubmissions,
    actualSubmissions,
    participationRate,
    topPerformerByGrade,
    incompleteTeachers,
  }
}
