'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type FileStatus = {
  name: string
  status: 'pending' | 'uploading' | 'attaching' | 'done' | 'error'
  message?: string
}

type GradeStatus = {
  gradeLevel: number
  lastLoadedFilename: string | null
  lastLoadedDay: number | null
  missingDays: { day: number; filename: string }[]
}

const GRADE_LABELS: Record<number, string> = { 0: 'Training', 3: 'Grade 3', 4: 'Grade 4', 5: 'Grade 5' }

export default function AdminVideosPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [files, setFiles] = useState<FileStatus[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [running, setRunning] = useState(false)
  const [gradeStatuses, setGradeStatuses] = useState<GradeStatus[]>([])
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => { checkAccess() }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('admins').select('role').eq('user_id', user.id).single()
    setAuthorized(admin?.role === 'owner')
    if (admin?.role === 'owner') await loadVideoStatus()
  }

  async function loadVideoStatus() {
    setStatusLoading(true)
    const { data: rows } = await supabase
      .from('questions')
      .select('grade_level, day_number, video_filename, video_url')
      .order('day_number')

    const grades = [3, 4, 5, 0]
    const statuses: GradeStatus[] = grades.map(gl => {
      const gradeRows = (rows || []).filter(r => r.grade_level === gl)
      const loadedRows = gradeRows.filter(r => r.video_url)

      if (loadedRows.length === 0) {
        return { gradeLevel: gl, lastLoadedFilename: null, lastLoadedDay: null, missingDays: [] }
      }

      const lastLoadedDay = Math.max(...loadedRows.map(r => r.day_number))
      const lastLoadedRow = loadedRows.find(r => r.day_number === lastLoadedDay)

      const missingDays = gradeRows
        .filter(r => r.day_number <= lastLoadedDay && !r.video_url)
        .map(r => ({ day: r.day_number, filename: r.video_filename || `(day ${r.day_number})` }))

      return {
        gradeLevel: gl,
        lastLoadedFilename: lastLoadedRow?.video_filename || null,
        lastLoadedDay,
        missingDays,
      }
    })

    setGradeStatuses(statuses)
    setStatusLoading(false)
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || [])
    setSelectedFiles(picked)
    setFiles(picked.map(f => ({ name: f.name, status: 'pending' })))
  }

  function updateStatus(name: string, status: FileStatus['status'], message?: string) {
    setFiles(prev => prev.map(f => f.name === name ? { ...f, status, message } : f))
  }

  async function handleUploadAll() {
    setRunning(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setRunning(false); return }

    for (const file of selectedFiles) {
      updateStatus(file.name, 'uploading')

      // Ask our server (using the proven service_role key) to pre-approve this upload
      const authRes = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, accessToken: session.access_token }),
      })
      const authResult = await authRes.json()

      if (authResult.error) {
        updateStatus(file.name, 'error', authResult.error)
        continue
      }

      const { error: uploadErr } = await supabase.storage
        .from('videos')
        .uploadToSignedUrl(authResult.path, authResult.token, file)

      if (uploadErr) {
        console.error('FULL UPLOAD ERROR:', uploadErr)
        updateStatus(file.name, 'error', JSON.stringify(uploadErr, Object.getOwnPropertyNames(uploadErr)))
        continue
      }

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(file.name)

      updateStatus(file.name, 'attaching')

      const res = await fetch('/api/attach-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, url: urlData.publicUrl, accessToken: session.access_token }),
      })
      const result = await res.json()

      if (result.error) {
        updateStatus(file.name, 'error', result.error)
      } else if (!result.matched) {
        updateStatus(file.name, 'error', 'Uploaded, but no question has this exact video_filename — check spelling.')
      } else {
        updateStatus(file.name, 'done', `Attached to Grade ${result.question.grade_level}, Day ${result.question.day_number}`)
      }
    }

    setRunning(false)
    await loadVideoStatus()
  }

  if (authorized === null) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Checking access...</p></main>
  if (authorized === false) return <main className="app"><div className="panel"><h2>Not Authorized</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Admin Tools</span>
        <h2>Upload Videos</h2>
        <p className="sub">Select one or more mp4 files. Each one auto-matches to a question by its exact filename — the same names you put in the video_filename column of your spreadsheet.</p>

        <span className="eyebrow" style={{ display: 'block', marginTop: 6 }}>Current Status, By Grade</span>
        {statusLoading ? (
          <p className="sub" style={{ fontSize: 14 }}>Checking what's loaded so far...</p>
        ) : (
          <div style={{ marginBottom: 26 }}>
            {gradeStatuses.map(gs => (
              <div key={gs.gradeLevel} style={{
                background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 12,
                padding: '16px 18px', marginBottom: 10, fontSize: 14,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--star)', marginBottom: 6 }}>{GRADE_LABELS[gs.gradeLevel]}</div>
                {gs.lastLoadedFilename === null ? (
                  <div style={{ color: 'var(--star-dim)' }}>No videos loaded yet.</div>
                ) : gs.missingDays.length === 0 ? (
                  <div style={{ color: 'var(--thruster)' }}>
                    ✅ The last video loaded was <strong>&ldquo;{gs.lastLoadedFilename}&rdquo;</strong> (Day {gs.lastLoadedDay}). All videos up to that day have loaded successfully!
                  </div>
                ) : (
                  <div style={{ color: 'var(--solar)' }}>
                    ⚠ The last video loaded was <strong>&ldquo;{gs.lastLoadedFilename}&rdquo;</strong> (Day {gs.lastLoadedDay}), but {gs.missingDays.length} day{gs.missingDays.length === 1 ? ' is' : 's are'} still missing before that point:{' '}
                    {gs.missingDays.map(m => `"${m.filename}" (Day ${m.day})`).join(', ')}.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <input type="file" accept="video/mp4" multiple onChange={handleSelect} style={{ marginBottom: 20, color: 'var(--star)' }} />

        {files.length > 0 && (
          <button className="btn btn-primary btn-full" disabled={running} onClick={handleUploadAll} style={{ marginBottom: 20 }}>
            {running ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </button>
        )}

        {files.map(f => (
          <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--panel-edge)', fontSize: 14 }}>
            <span>{f.name}</span>
            <span style={{
              color: f.status === 'done' ? 'var(--thruster)' : f.status === 'error' ? 'var(--alert)' : 'var(--star-dim)',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textAlign: 'right', maxWidth: '55%',
            }}>
              {f.status === 'pending' && 'Waiting...'}
              {f.status === 'uploading' && 'Uploading...'}
              {f.status === 'attaching' && 'Matching to question...'}
              {f.status === 'done' && `✅ ${f.message}`}
              {f.status === 'error' && `⚠ ${f.message}`}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
