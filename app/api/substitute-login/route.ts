import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: 'Enter both the teacher\'s email and today\'s code' }, { status: 400 })
  }

  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('email, substitute_enabled, substitute_code')
    .eq('email', email)
    .maybeSingle()

  if (!teacher || !teacher.substitute_enabled || !teacher.substitute_code || teacher.substitute_code !== code) {
    return NextResponse.json({ error: 'Invalid code, or substitute access isn\'t turned on for this teacher today.' }, { status: 401 })
  }

  // Generate and immediately verify a magic link server-side — this
  // produces a real, valid session for the teacher's own account,
  // without ever touching or needing their actual password.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Could not create a session. Please try again.' }, { status: 500 })
  }

  const { data: verified, error: verifyErr } = await supabaseAdmin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyErr || !verified?.session) {
    return NextResponse.json({ error: 'Could not create a session. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  })
}
