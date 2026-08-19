import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { schoolId, accessToken } = await req.json()

  if (!schoolId || !accessToken) {
    return NextResponse.json({ error: 'Missing schoolId or accessToken' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: admin } = await callerClient.from('admins').select('school_id').eq('user_id', user.id).single()
  if (!admin || admin.school_id !== schoolId) {
    return NextResponse.json({ error: 'Not authorized for this school' }, { status: 403 })
  }

  // Reset the SCOREBOARD only — daily_history (every day, every year) is
  // never touched, and the day counter keeps counting up rather than
  // resetting, so next year's questions just continue where this year
  // left off instead of colliding with Day 1 of a prior year.
  const { data: updatedSections, error: updateErr } = await supabaseAdmin
    .from('sections')
    .update({ best_pct: 0, board_pos: 0, laps: 0 })
    .eq('school_id', schoolId)
    .select('id')

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, sectionsReset: updatedSections?.length || 0 })
}
