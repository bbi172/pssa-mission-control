import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'
import { advanceOneSchool } from '@/lib/advanceSchoolDay'

// This route is called automatically by Vercel's Cron Jobs on a schedule
// (see vercel.json) — no human ever needs to click anything. Vercel
// automatically sends the CRON_SECRET as an Authorization header, which
// we check below to make sure nobody else can trigger this.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: schools, error } = await supabaseAdmin.from('schools').select('id, name')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []
  for (const school of schools || []) {
    try {
      const newDay = await advanceOneSchool(school.id, false)
      results.push({ school: school.name, advancedTo: newDay })
    } catch (e: any) {
      results.push({ school: school.name, error: e.message })
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), results })
}
