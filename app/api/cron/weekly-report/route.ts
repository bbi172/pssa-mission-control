import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'
import { generateWeeklyReportData } from '@/lib/generateWeeklyReport'
import { renderWeeklyReportPdf } from '@/lib/renderReportPdf'
import { sendWeeklyReportEmail } from '@/lib/sendWeeklyReportEmail'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: schools, error } = await supabaseAdmin.from('schools').select('id, name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []
  for (const school of schools || []) {
    try {
      const reportData = await generateWeeklyReportData(school.id)
      const pdfBuffer = await renderWeeklyReportPdf(reportData)
      const sendResult = await sendWeeklyReportEmail(school.id, reportData, pdfBuffer)
      results.push({ school: school.name, ...sendResult })
    } catch (e: any) {
      results.push({ school: school.name, error: e.message })
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), results })
}
