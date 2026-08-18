import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

type IncomingRow = {
  teacher_name: string
  district_email: string
  grade_level: number
  class_id: string
  section_label: string
}

export async function POST(req: NextRequest) {
  const { rows, accessToken }: { rows: IncomingRow[]; accessToken: string } = await req.json()

  if (!rows || rows.length === 0 || !accessToken) {
    return NextResponse.json({ error: 'Missing rows or accessToken' }, { status: 400 })
  }

  // Verify the caller is really an admin linked to a real school
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

  if (!admin || !admin.school_id) {
    return NextResponse.json({ error: 'Not authorized — admin account not linked to a school' }, { status: 403 })
  }

  const schoolId = admin.school_id
  const summary = {
    invited: [] as string[],
    existingTeachers: [] as string[],
    sectionsCreated: [] as string[],
    sectionsSkipped: [] as string[],
    errors: [] as string[],
  }

  const uniqueEmails = [...new Set(rows.map(r => r.district_email))]

  for (const email of uniqueEmails) {
    const rowsForThisTeacher = rows.filter(r => r.district_email === email)
    const name = rowsForThisTeacher[0].teacher_name
    const gradeLevel = rowsForThisTeacher[0].grade_level

    const { data: existingTeacher } = await supabaseAdmin
      .from('teachers').select('id').eq('email', email).maybeSingle()

    let teacherId = existingTeacher?.id

    if (!teacherId) {
      // Creates the real login AND automatically emails a
      // "set your password" link — no custom email code needed.
      const { data: newUser, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

      if (inviteErr || !newUser?.user) {
        summary.errors.push(`${email}: ${inviteErr?.message || 'invite failed'}`)
        continue
      }

      const { data: newTeacher, error: teacherErr } = await supabaseAdmin
        .from('teachers')
        .insert({ user_id: newUser.user.id, school_id: schoolId, name, email, grade_level: gradeLevel })
        .select('id').single()

      if (teacherErr || !newTeacher) {
        summary.errors.push(`${email}: ${teacherErr?.message || 'teacher row failed'}`)
        continue
      }

      teacherId = newTeacher.id
      summary.invited.push(email)
    } else {
      summary.existingTeachers.push(email)
    }

    for (const row of rowsForThisTeacher) {
      const { data: existingSection } = await supabaseAdmin
        .from('sections').select('id').eq('teacher_id', teacherId).eq('label', row.section_label).maybeSingle()

      if (existingSection) {
        summary.sectionsSkipped.push(`${email} — ${row.section_label}`)
        continue
      }

      const { error: sectionErr } = await supabaseAdmin
        .from('sections').insert({ teacher_id: teacherId, school_id: schoolId, label: row.section_label })

      if (sectionErr) {
        summary.errors.push(`${email} section ${row.section_label}: ${sectionErr.message}`)
      } else {
        summary.sectionsCreated.push(`${email} — ${row.section_label}`)
      }
    }
  }

  return NextResponse.json(summary)
}
