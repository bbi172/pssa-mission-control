import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

type IncomingRow = {
  grade_level: number
  day_number: number
  subject: string
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_answer: string
  video_filename: string
}

export async function POST(req: NextRequest) {
  const { rows }: { rows: IncomingRow[] } = await req.json()

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No rows received' }, { status: 400 })
  }

  // Find the furthest-along day any school has already reached — anything
  // at or before that day number is locked historical data and must not
  // be silently overwritten.
  const { data: schools, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .select('current_day_index')

  if (schoolErr) {
    return NextResponse.json({ error: schoolErr.message }, { status: 500 })
  }

  const maxCompletedDay = schools?.reduce((max, s) => Math.max(max, s.current_day_index), 0) ?? 0

  const safeRows = rows.filter(r => r.day_number > maxCompletedDay)
  const skippedRows = rows.filter(r => r.day_number <= maxCompletedDay)

  if (safeRows.length > 0) {
    const { error: upsertErr } = await supabaseAdmin
      .from('questions')
      .upsert(safeRows, { onConflict: 'grade_level,day_number' })

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    uploaded: safeRows.length,
    skipped: skippedRows.map(r => ({ grade: r.grade_level, day: r.day_number })),
    skippedCount: skippedRows.length,
  })
}
