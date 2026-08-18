import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { advanceOneSchool } from '@/lib/advanceSchoolDay'

export async function POST(req: NextRequest) {
  const { schoolId, isClosure, reason, accessToken } = await req.json()

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

  const { data: admin } = await callerClient
    .from('admins')
    .select('school_id')
    .eq('user_id', user.id)
    .single()

  if (!admin || admin.school_id !== schoolId) {
    return NextResponse.json({ error: 'Not authorized for this school' }, { status: 403 })
  }

  try {
    const newDayNumber = await advanceOneSchool(schoolId, isClosure, reason)
    return NextResponse.json({ success: true, newDayNumber })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
