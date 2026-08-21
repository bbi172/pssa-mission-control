import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'
 
export async function POST(req: NextRequest) {
  const { adminId, accessToken } = await req.json()
  if (!adminId || !accessToken) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
 
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })
 
  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
 
  const { data: callerAdmin } = await callerClient.from('admins').select('role').eq('user_id', user.id).single()
  if (!callerAdmin || (callerAdmin.role !== 'owner' && callerAdmin.role !== 'district_admin')) {
    return NextResponse.json({ error: 'Only an Owner or District Administrator can remove administrators' }, { status: 403 })
  }
 
  const { data: target } = await supabaseAdmin.from('admins').select('user_id, role').eq('id', adminId).single()
  if (!target) return NextResponse.json({ error: 'Administrator not found' }, { status: 404 })
 
  if (target.role === 'owner' && callerAdmin.role !== 'owner') {
    return NextResponse.json({ error: 'Only an Owner can remove another Owner' }, { status: 403 })
  }
 
  const { error: deleteErr } = await supabaseAdmin.from('admins').delete().eq('id', adminId)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })
 
  const { data: stillTeacher } = await supabaseAdmin.from('teachers').select('id').eq('user_id', target.user_id).maybeSingle()
  if (!stillTeacher && target.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(target.user_id)
  }
 
  return NextResponse.json({ success: true })
}