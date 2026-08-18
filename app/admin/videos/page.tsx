'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type FileStatus = {
  name: string
  status: 'pending' | 'uploading' | 'attaching' | 'done' | 'error'
  message?: string
}

export default function AdminVideosPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [files, setFiles] = useState<FileStatus[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => { checkAccess() }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
    setAuthorized(!!admin)
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
  }

  if (authorized === null) return <main className="app"><p style={{ color: 'var(--star-dim)' }}>Checking access...</p></main>
  if (authorized === false) return <main className="app"><div className="panel"><h2>Not Authorized</h2></div></main>

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Admin Tools</span>
        <h2>Upload Videos</h2>
        <p className="sub">Select one or more mp4 files. Each one auto-matches to a question by its exact filename — the same names you put in the video_filename column of your spreadsheet.</p>

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
