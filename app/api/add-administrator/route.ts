import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { name, email, role, schoolId, accessToken } = await req.json()

  if (!name || !email || !role || !accessToken) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (role !== 'district_admin' && !schoolId) {
    return NextResponse.json({ error: 'A school must be selected for this role' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Only an existing District Administrator may add another administrator —
  // this is the real access-control check for this whole feature.
  const { data: callerAdmin } = await callerClient.from('admins').select('role, district_id').eq('user_id', user.id).single()
  if (!callerAdmin || (callerAdmin.role !== 'district_admin' && callerAdmin.role !== 'owner')) {
    return NextResponse.json({ error: 'Only a District Administrator can add other administrators.' }, { status: 403 })
  }

  const { data: existingAdmin } = await supabaseAdmin.from('admins').select('id').eq('email', email).maybeSingle()
  if (existingAdmin) {
    return NextResponse.json({ error: 'This email is already an administrator.' }, { status: 400 })
  }

  // If this person already has an account (e.g. as a teacher), reuse it
  // instead of sending a confusing second invite.
  const { data: existingTeacher } = await supabaseAdmin.from('teachers').select('user_id').eq('email', email).maybeSingle()

  let userId = existingTeacher?.user_id
  let invited = false

  if (!userId) {
    const { data: newUser, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/set-password`,
    })
    if (inviteErr || !newUser?.user) {
      return NextResponse.json({ error: inviteErr?.message || 'Could not invite this email' }, { status: 500 })
    }
    userId = newUser.user.id
    invited = true
  }

  const { error: insertErr } = await supabaseAdmin.from('admins').insert({
    user_id: userId,
    school_id: role === 'district_admin' ? null : schoolId,
    district_id: callerAdmin.district_id,
    name,
    email,
    role,
    receives_weekly_email: true,
  })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ success: true, invited })
}
