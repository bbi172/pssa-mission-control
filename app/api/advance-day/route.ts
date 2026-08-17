import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { schoolId, isClosure, reason, accessToken } = await req.json()

  if (!schoolId || !accessToken) {
    return NextResponse.json({ error: 'Missing schoolId or accessToken' }, { status: 400 })
  }

  // Verify the caller is really an admin of THIS school, using their own
  // session token (not the service role) — this is the check that keeps
  // this powerful action from being callable by just anyone.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: admin } = await callerClient
    .from('admins')
    .select('school_id')
    .eq('user_id', user.id)
    .single()

  if (!admin || admin.school_id !== schoolId) {
    return NextResponse.json({ error: 'Not authorized for this school' }, { status: 403 })
  }

  // From here on, do the actual privileged work with the service role.
  const { data: school, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .select('current_day_index')
    .eq('id', schoolId)
    .single()

  if (schoolErr || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  const dayNumber = school.current_day_index + 1

  if (isClosure) {
    const { error: closureErr } = await supabaseAdmin
      .from('school_closures')
      .insert({ school_id: schoolId, day_number: dayNumber, reason: reason || 'School Closed' })
    if (closureErr) {
      return NextResponse.json({ error: closureErr.message }, { status: 500 })
    }
  } else {
    // Auto-mark any section that never submitted today as DID NOT COMPLETE
    const { data: sections, error: secErr } = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('school_id', schoolId)

    if (secErr) {
      return NextResponse.json({ error: secErr.message }, { status: 500 })
    }

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

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, newDayNumber: dayNumber })
}
