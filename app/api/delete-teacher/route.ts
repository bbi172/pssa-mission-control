import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'
 
export async function POST(req: NextRequest) {
  const { teacherId, accessToken } = await req.json()
  if (!teacherId || !accessToken) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
 
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })
 
  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
 
  const { data: callerAdmin } = await callerClient.from('admins').select('role, school_id').eq('user_id', user.id).single()
  if (!callerAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
 
  const { data: teacher } = await supabaseAdmin.from('teachers').select('user_id, school_id').eq('id', teacherId).single()
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
 
  // School admins can only delete teachers at their own school; owner/district_admin can delete any
  const isSchoolLevel = callerAdmin.role === 'school_admin'
  if (isSchoolLevel && callerAdmin.school_id !== teacher.school_id) {
    return NextResponse.json({ error: 'You can only remove teachers at your own school' }, { status: 403 })
  }
 
  // Deleting the teacher row cascades to their sections and daily_history automatically
  const { error: deleteErr } = await supabaseAdmin.from('teachers').delete().eq('id', teacherId)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })
 
  // Only remove their actual login if they have no OTHER role (e.g. not also an admin)
  const { data: stillAdmin } = await supabaseAdmin.from('admins').select('id').eq('user_id', teacher.user_id).maybeSingle()
  if (!stillAdmin && teacher.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(teacher.user_id)
  }
 
  return NextResponse.json({ success: true })
}