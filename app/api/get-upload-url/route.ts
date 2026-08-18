import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

export async function POST(req: NextRequest) {
  const { filename, accessToken } = await req.json()

  if (!filename || !accessToken) {
    return NextResponse.json({ error: 'Missing filename or accessToken' }, { status: 400 })
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

  // Uses the proven service_role key to pre-approve this specific upload
  const { data, error } = await supabaseAdmin.storage
    .from('videos')
    .createSignedUploadUrl(filename, { upsert: true } as any)

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create signed upload URL' }, { status: 500 })
  }

  return NextResponse.json({ token: data.token, path: data.path })
}
