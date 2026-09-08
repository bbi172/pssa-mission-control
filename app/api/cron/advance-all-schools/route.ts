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
 
  const { data: schools, error } = await supabaseAdmin.from('schools').select('id, name, last_advanced_at')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
 
  const SKIP_WINDOW_HOURS = 12
  const results = []
  for (const school of schools || []) {
    const hoursSinceAdvance = school.last_advanced_at
      ? (Date.now() - new Date(school.last_advanced_at).getTime()) / (1000 * 60 * 60)
      : Infinity
 
    if (hoursSinceAdvance < SKIP_WINDOW_HOURS) {
      // Someone (or something) already advanced this school recently —
      // most likely a manual closure earlier today. Advancing again would
      // double-count and falsely mark today's real pending day as missed.
      results.push({ school: school.name, skipped: true, reason: `Already advanced ${hoursSinceAdvance.toFixed(1)}h ago` })
      continue
    }
 
    try {
      const newDay = await advanceOneSchool(school.id, false)
      results.push({ school: school.name, advancedTo: newDay })
    } catch (e: any) {
      results.push({ school: school.name, error: e.message })
    }
  }
 
  return NextResponse.json({ ranAt: new Date().toISOString(), results })
}