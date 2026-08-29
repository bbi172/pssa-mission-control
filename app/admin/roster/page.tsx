'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabaseClient'

type ParsedRow = {
  teacher_name: string
  district_email: string
  grade_level: number
  class_id: string
  section_label: string
}

export default function UploadRosterPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { checkAccess() }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin } = await supabase
      .from('admins').select('school_id').eq('user_id', user.id).single()

    setAuthorized(!!admin?.school_id)
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
      const sheet = workbook.Sheets['Teachers']
      if (!sheet) { setStatus('No "Teachers" tab found in this file.'); return }

      const json: any[] = XLSX.utils.sheet_to_json(sheet)
      const parsed: ParsedRow[] = json
        .filter(r => r.teacher_name && r.district_email)
        .map(r => ({
          teacher_name: String(r.teacher_name),
          district_email: String(r.district_email).trim().toLowerCase(),
          grade_level: Number(r.grade_level),
          class_id: String(r.class_id ?? ''),
          section_label: String(r.section_label ?? 'All Day'),
        }))
      setRows(parsed)
    }
    reader.readAsBinaryString(file)
  }

  async function handleUpload() {
    setUploading(true)
    setStatus('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploading(false); return }

    const res = await fetch('/api/upload-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, accessToken: session.access_token }),
    })
    const result = await res.json()
    setUploading(false)

    if (result.error) {
      setStatus(`Error: ${result.error}`)
      return
    }

    let msg = `✅ ${result.invited.length} new teacher(s) invited — password-setup email sent automatically.\n`
    msg += `${result.sectionsCreated.length} new class section(s) created.\n`
    if (result.existingTeachers.length > 0) msg += `${result.existingTeachers.length} teacher(s) already existed — not re-invited.\n`
    if (result.sectionsSkipped.length > 0) msg += `${result.sectionsSkipped.length} section(s) already existed — skipped.\n`
    if (result.errors.length > 0) msg += `⚠ ${result.errors.length} error(s): ${result.errors.join('; ')}`

    setStatus(msg)
  }

  if (authorized === null) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Checking access...</p></main>
  if (authorized === false) return <main className="app"><div className="panel"><h2>Not Authorized</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Admin Tools</span>
        <h2>Upload Teacher Roster</h2>
        <p className="sub">Upload the Roster spreadsheet's Teachers tab. New teachers are automatically emailed a link to set their own password.</p>

        <input type="file" id="rosterFileInput" accept=".xlsx" onChange={handleFile} style={{ display: 'none' }} />
        <label
          htmlFor="rosterFileInput"
          className="btn btn-primary"
          style={{ cursor: 'pointer', display: 'inline-flex', marginBottom: 20 }}
        >
          📁 Choose Spreadsheet File
        </label>

        {fileName && <p className="sub">Read {rows.length} rows from <strong>{fileName}</strong>.</p>}

        <button className="btn btn-primary btn-full" disabled={rows.length === 0 || uploading} onClick={handleUpload}>
          {uploading ? 'Uploading...' : `Upload ${rows.length} Rows`}
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
