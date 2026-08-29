import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

type IncomingQuote = {
  grade_level: number
  day_number: number
  quote_text: string
  author: string
}

export async function POST(req: NextRequest) {
  const { rows, accessToken }: { rows: IncomingQuote[]; accessToken: string } = await req.json()

  if (!rows || rows.length === 0 || !accessToken) {
    return NextResponse.json({ error: 'Missing rows or accessToken' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: { user }, error: userErr } = await callerClient.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: admin } = await callerClient.from('admins').select('role').eq('user_id', user.id).single()
  if (!admin || admin.role !== 'owner') {
    return NextResponse.json({ error: 'Only the Owner can upload quotes' }, { status: 403 })
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('quotes')
    .upsert(rows, { onConflict: 'grade_level,day_number' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ uploaded: rows.length })
}
