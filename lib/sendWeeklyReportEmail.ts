import { Resend } from 'resend'
import { supabaseAdmin } from './supabaseAdminClient'
import type { WeeklyReportData } from './generateWeeklyReport'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWeeklyReportEmail(schoolId: string, data: WeeklyReportData, pdfBuffer: Buffer) {
  const { data: admins, error } = await supabaseAdmin
    .from('admins')
    .select('email, name')
    .eq('school_id', schoolId)
    .eq('receives_weekly_email', true)

  if (error) throw new Error(error.message)
  if (!admins || admins.length === 0) {
    return { sent: false, reason: 'No administrators are set to receive the weekly email for this school.' }
  }

  const recipientList = admins.map(a => a.email)

  const missedCount = data.incompleteTeachers.length
  const missedLine = missedCount === 0
    ? 'Every classroom completed every mission this week!'
    : `${missedCount} classroom(s) had at least one incomplete day this week — see the attached report for details.`

  await resend.emails.send({
    from: 'PSSA Mission Control <reports@bbi-ventures.com>',
    to: recipientList,
    subject: `${data.schoolName} — Weekly Mission Report (Days ${data.weekStartDay}–${data.weekEndDay})`,
    html: `
      <div style="font-family: sans-serif; color: #16233f; max-width: 500px;">
        <h2>${data.schoolName} — Weekly Mission Report</h2>
        <p>This week's summary is attached as a printable PDF for the Mission Control hallway board.</p>
        <p><strong>${missedLine}</strong></p>
        <p style="color: #4b5878; font-size: 13px;">Highest score this week: ${data.highestPctThisWeek}% · School goal: ${data.schoolGoal}%</p>
      </div>
    `,
    attachments: [
      {
        filename: `mission-control-weekly-report-day${data.weekEndDay}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  })

  return { sent: true, recipientCount: recipientList.length }
}
