'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabaseClient'

const GRADE_SHEETS: Record<string, number> = {
  'Grade 3': 3,
  'Grade 4': 4,
  'Grade 5': 5,
}

type ParsedRow = {
  grade_level: number
  day_number: number
  subject: string
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_answer: string
  video_filename: string
}

export default function UploadQuestionsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .single()

    setAuthorized(admin?.role === 'district_admin')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setStatus('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })

      const parsed: ParsedRow[] = []
      for (const sheetName of Object.keys(GRADE_SHEETS)) {
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) continue
        const json: any[] = XLSX.utils.sheet_to_json(sheet)
        for (const r of json) {
          if (!r.day_number || !r.question_text) continue
          parsed.push({
            grade_level: GRADE_SHEETS[sheetName],
            day_number: Number(r.day_number),
            subject: r.subject || 'Math',
            question_text: String(r.question_text),
            choice_a: String(r.choice_a ?? ''),
            choice_b: String(r.choice_b ?? ''),
            choice_c: String(r.choice_c ?? ''),
            choice_d: String(r.choice_d ?? ''),
            correct_answer: String(r.correct_answer ?? '').trim().toUpperCase(),
            video_filename: String(r.video_filename ?? ''),
          })
        }
      }
      setRows(parsed)
    }
    reader.readAsBinaryString(file)
  }

  async function handleUpload() {
    setUploading(true)
    setStatus('')

    const res = await fetch('/api/upload-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const result = await res.json()
    setUploading(false)

    if (result.error) {
      setStatus(`Error: ${result.error}`)
      return
    }

    let msg = `✅ Uploaded/updated ${result.uploaded} questions.`
    if (result.skippedCount > 0) {
      msg += `\n⚠ Skipped ${result.skippedCount} question(s) that fall on a day already completed by a school (their historical data was protected, not overwritten): ` +
        result.skipped.map((s: any) => `Grade ${s.grade} Day ${s.day}`).join(', ')
    }
    setStatus(msg)
  }

  if (authorized === null) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Checking access...</p></main>
  if (authorized === false) return <main className="app"><div className="panel"><h2>Not Authorized</h2><p className="sub">This page is only available to the District Administrator.</p></div></main>

  const countsByGrade = rows.reduce((acc: Record<number, number>, r) => {
    acc[r.grade_level] = (acc[r.grade_level] || 0) + 1
    return acc
  }, {})

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Owner Tools</span>
        <h2>Upload Question Bank</h2>
        <p className="sub">Upload the Question &amp; Video Bank spreadsheet. Days already completed by any school are automatically protected.</p>

        <input type="file" accept=".xlsx" onChange={handleFile} style={{ marginBottom: 20, color: 'var(--star)' }} />

        {fileName && (
          <div style={{ marginBottom: 20 }}>
            <p className="sub" style={{ marginBottom: 8 }}>Read from <strong>{fileName}</strong>:</p>
            {Object.entries(countsByGrade).map(([grade, count]) => (
              <div key={grade} className="sub">Grade {grade}: {count} questions found</div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-full" disabled={rows.length === 0 || uploading} onClick={handleUpload}>
          {uploading ? 'Uploading...' : `Upload ${rows.length} Questions`}
        </button>

        {status && (
          <pre style={{ marginTop: 20, background: 'var(--void)', padding: 16, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--star)' }}>
            {status}
          </pre>
        )}
      </div>
    </main>
  )
}
