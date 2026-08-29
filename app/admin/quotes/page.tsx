'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabaseClient'

const GRADE_SHEETS: Record<string, number> = {
  'Grade 3': 3,
  'Grade 4': 4,
  'Grade 5': 5,
  'Training': 0,
}

type ParsedQuote = { grade_level: number; day_number: number; quote_text: string; author: string }

export default function UploadQuotesPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [rows, setRows] = useState<ParsedQuote[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { checkAccess() }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('admins').select('role').eq('user_id', user.id).single()
    setAuthorized(admin?.role === 'owner')
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

      const parsed: ParsedQuote[] = []
      for (const sheetName of Object.keys(GRADE_SHEETS)) {
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) continue
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false })
        for (const r of json) {
          if (!r.day_number || !r.quote_text) continue
          parsed.push({
            grade_level: GRADE_SHEETS[sheetName],
            day_number: Number(r.day_number),
            quote_text: String(r.quote_text),
            author: String(r.author ?? 'Unknown'),
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploading(false); return }

    const res = await fetch('/api/upload-quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, accessToken: session.access_token }),
    })
    const result = await res.json()
    setUploading(false)

    if (result.error) { setStatus(`Error: ${result.error}`); return }
    setStatus(`✅ Uploaded/updated ${result.uploaded} quotes.`)
  }

  if (authorized === null) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Checking access...</p></main>
  if (authorized === false) return <main className="app"><div className="panel"><h2>Not Authorized</h2></div></main>

  const countsByGrade = rows.reduce((acc: Record<number, number>, r) => {
    acc[r.grade_level] = (acc[r.grade_level] || 0) + 1
    return acc
  }, {})

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Owner Tools</span>
        <h2>Upload Motivational Quotes</h2>
        <p className="sub">One quote per grade, per day — shown to the class at the end of each Mission Day.</p>

        <input type="file" accept=".xlsx" onChange={handleFile} style={{ marginBottom: 20, color: 'var(--star)' }} />

        {fileName && (
          <div style={{ marginBottom: 20 }}>
            <p className="sub" style={{ marginBottom: 8 }}>Read from <strong>{fileName}</strong>:</p>
            {Object.entries(countsByGrade).map(([grade, count]) => (
              <div key={grade} className="sub">Grade {grade}: {count} quotes found</div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-full" disabled={rows.length === 0 || uploading} onClick={handleUpload}>
          {uploading ? 'Uploading...' : `Upload ${rows.length} Quotes`}
        </button>

        {status && <p style={{ marginTop: 16, fontSize: 14, color: 'var(--star)' }}>{status}</p>}
      </div>
    </main>
  )
}
