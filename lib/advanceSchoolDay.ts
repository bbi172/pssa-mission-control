import { supabaseAdmin } from './supabaseAdminClient'

// Advances ONE school by one day. isClosure=true records a closure and
// skips penalizing anyone. isClosure=false is a normal day ending — any
// section with no submission for today gets auto-logged as missed.
export async function advanceOneSchool(schoolId: string, isClosure: boolean, reason?: string) {
  const { data: school, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .select('current_day_index')
    .eq('id', schoolId)
    .single()

  if (schoolErr || !school) {
    throw new Error(`School ${schoolId} not found`)
  }

  const dayNumber = school.current_day_index + 1

  if (isClosure) {
    const { error: closureErr } = await supabaseAdmin
      .from('school_closures')
      .insert({ school_id: schoolId, day_number: dayNumber, reason: reason || 'School Closed' })
    if (closureErr) throw new Error(closureErr.message)
  } else {
    const { data: sections, error: secErr } = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('school_id', schoolId)

    if (secErr) throw new Error(secErr.message)

    for (const s of sections || []) {
      const { data: existing } = await supabaseAdmin
        .from('daily_history')
        .select('id')
        .eq('section_id', s.id)
        .eq('day_number', dayNumber)
        .maybeSingle()

      if (!existing) {
        await supabaseAdmin.from('daily_history').insert({
          section_id: s.id,
          day_number: dayNumber,
          missed: true,
        })
      }
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('schools')
    .update({ current_day_index: dayNumber })
    .eq('id', schoolId)

  if (updateErr) throw new Error(updateErr.message)

  return dayNumber
}
