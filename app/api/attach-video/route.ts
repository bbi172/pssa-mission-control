import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { filename, url, accessToken } = await req.json()

  if (!filename || !url || !accessToken) {
    return NextResponse.json({ error: 'Missing filename, url, or accessToken' }, { status: 400 })
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

  const { data: admin } = await callerClient.from('admins').select('id').eq('user_id', user.id).single()
  if (!admin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: matched, error: updateErr } = await supabaseAdmin
    .from('questions')
    .update({ video_url: url })
    .eq('video_filename', filename)
    .select('id, grade_level, day_number')

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  if (!matched || matched.length === 0) {
    return NextResponse.json({ matched: false, message: `No question found with video_filename = "${filename}"` })
  }

  return NextResponse.json({ matched: true, question: matched[0] })
}
