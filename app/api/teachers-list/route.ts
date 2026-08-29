import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json()
  if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })

  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: admin } = await callerClient.from('admins').select('role, school_id, district_id').eq('user_id', user.id).single()
  if (!admin) return NextResponse.json({ error: 'Not an administrator' }, { status: 403 })

  let schoolIds: string[] = []
  if (admin.role === 'school_admin') {
    if (!admin.school_id) return NextResponse.json({ error: 'Not linked to a school' }, { status: 400 })
    schoolIds = [admin.school_id]
  } else {
    const { data: schools } = await supabaseAdmin.from('schools').select('id').eq('district_id', admin.district_id)
    schoolIds = (schools || []).map(s => s.id)
  }

  const { data: teachers } = await supabaseAdmin
    .from('teachers')
    .select('id, name, email, grade_level, school_id, user_id')
    .in('school_id', schoolIds)

  const { data: adminRows } = await supabaseAdmin.from('admins').select('user_id')
  const adminUserIds = new Set((adminRows || []).map(a => a.user_id))

  const includeAdminLinked = admin.role !== 'school_admin'
  const visibleTeachers = (teachers || [])
    .filter(t => includeAdminLinked || !adminUserIds.has(t.user_id))
    .map(t => ({ ...t, isAdminAccount: adminUserIds.has(t.user_id) }))
    .sort((a, b) => a.grade_level - b.grade_level || a.name.localeCompare(b.name))

  return NextResponse.json({ teachers: visibleTeachers })
}
