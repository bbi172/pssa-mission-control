'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Section = {
  id: string
  label: string
  best_pct: number
  board_pos: number
  laps: number
  teacher_id: string
  school_id: string
}

type SchoolInfo = {
  id: string
  school_goal_pct: number
  current_day_index: number
}

type Question = {
  id: string
  day_number: number
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_answer: string
  video_url: string | null
}

type Step = 'intro' | 'question' | 'tally' | 'video' | 'results'

export default function MissionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [teacherName, setTeacherName] = useState('')
  const [gradeLevel, setGradeLevel] = useState<number | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [school, setSchool] = useState<SchoolInfo | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [classAverage, setClassAverage] = useState(0)

  const [step, setStep] = useState<Step>('intro')
  const [tally, setTally] = useState({ A: 0, B: 0, C: 0, D: 0, NA: 0 })
  const [submitting, setSubmitting] = useState(false)

  // results, computed at submit time
  const [pct, setPct] = useState(0)
  const [oldBest, setOldBest] = useState(0)
  const [grew, setGrew] = useState(false)
  const [metGoal, setMetGoal] = useState(false)
  const [moved, setMoved] = useState(false)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [reachedStar, setReachedStar] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: adminRow } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
      setIsAdmin(!!adminRow)

      const { data: teacher, error: tErr } = await supabase
        .from('teachers').select('*').eq('user_id', user.id).single()

      if (tErr || !teacher) {
        setError('No teacher record is linked to this account yet.')
        setLoading(false)
        return
      }

      setTeacherName(teacher.name)
      setGradeLevel(teacher.grade_level)

      const { data: secs, error: sErr } = await supabase
        .from('sections').select('*').eq('teacher_id', teacher.id)

      if (sErr || !secs || secs.length === 0) {
        setError('No classes are set up for this teacher yet.')
        setLoading(false)
        return
      }

      setSections(secs)

      if (secs.length === 1) {
        await selectSection(secs[0], teacher.grade_level)
      } else {
        setLoading(false)
      }
    } catch (e: any) {
      setError(`Unexpected error while loading: ${e?.message || String(e)}`)
      setLoading(false)
    }
  }

  async function selectSection(section: Section, grade: number) {
    try {
      setLoading(true)
      setSelectedSection(section)

      const { data: schoolData, error: schErr } = await supabase
        .from('schools').select('id, school_goal_pct, current_day_index').eq('id', section.school_id).single()

      if (schErr || !schoolData) {
        setError('Could not load school settings.')
        setLoading(false)
        return
      }
      setSchool(schoolData)

      const todaysDayNumber = schoolData.current_day_index + 1

      const { data: q, error: qErr } = await supabase
        .from('questions').select('*').eq('grade_level', grade).eq('day_number', todaysDayNumber).single()

      if (qErr || !q) {
        setError(`No question is loaded yet for Grade ${grade}, Day ${todaysDayNumber}.`)
        setLoading(false)
        return
      }
      setQuestion(q)

      const { data: existing } = await supabase
        .from('daily_history').select('*').eq('section_id', section.id).eq('day_number', q.day_number).maybeSingle()

      setAlreadyDone(!!existing && !existing.missed)

      // Class average, from every prior scored day — this is the real
      // "growth" benchmark now, since a fixed best-score ceiling (100%)
      // would otherwise make growth permanently impossible once hit.
      const { data: priorHistory } = await supabase
        .from('daily_history').select('pct').eq('section_id', section.id).eq('missed', false)

      const scoredPriorDays = (priorHistory || []).filter(h => h.pct !== null)
      const avg = scoredPriorDays.length > 0
        ? Math.round(scoredPriorDays.reduce((sum, h) => sum + (h.pct || 0), 0) / scoredPriorDays.length)
        : 0
      setClassAverage(avg)

      setStep('intro')
      setLoading(false)
    } catch (e: any) {
      setError(`Unexpected error while loading today's mission: ${e?.message || String(e)}`)
      setLoading(false)
    }
  }

  function calcPct(t: typeof tally, correctAnswer: string) {
    const total = t.A + t.B + t.C + t.D + t.NA
    if (total === 0) return 0
    const correctCount = t[correctAnswer as 'A' | 'B' | 'C' | 'D']
    const responded = total - t.NA
    return Math.round((correctCount / (responded || 1)) * 100)
  }

  async function handleSubmitTally() {
    if (!question || !selectedSection || !school) return
    setSubmitting(true)

    const p = calcPct(tally, question.correct_answer)
    const best = selectedSection.best_pct
    const didGrow = p > classAverage
    const didMeetGoal = p >= school.school_goal_pct
    const didMove = didGrow || didMeetGoal
    const newBest = Math.max(p, best)
    const isNewRecord = p > best

    let newBoardPos = selectedSection.board_pos
    let newLaps = selectedSection.laps
    let hitStar = false

    if (didMove) {
      newBoardPos += 1
      if (newBoardPos >= 31) {
        newBoardPos = 0
        newLaps += 1
        hitStar = true
      }
    }

    // Write the day's result — this is permanent, matches the "can't edit after submit" rule
    const { error: insertErr } = await supabase.from('daily_history').insert({
      section_id: selectedSection.id,
      day_number: question.day_number,
      pct: p,
      grew: didGrow,
      met_goal: didMeetGoal,
      moved: didMove,
      missed: false,
    })

    if (insertErr) {
      setError(`Could not save today's result: ${insertErr.message}`)
      setSubmitting(false)
      return
    }

    // Update the class's running stats
    const { error: updateErr } = await supabase
      .from('sections')
      .update({ best_pct: newBest, board_pos: newBoardPos, laps: newLaps })
      .eq('id', selectedSection.id)

    if (updateErr) {
      setError(`Result was saved, but updating class stats failed: ${updateErr.message}`)
      setSubmitting(false)
      return
    }

    // Reflect the change locally without needing to re-fetch
    setSelectedSection({ ...selectedSection, best_pct: newBest, board_pos: newBoardPos, laps: newLaps })
    setPct(p)
    setOldBest(best)
    setGrew(didGrow)
    setMetGoal(didMeetGoal)
    setMoved(didMove)
    setIsNewRecord(isNewRecord)
    setReachedStar(hitStar)
    setSubmitting(false)
    setStep('video')
  }

  function boardTrack(pos: number, laps: number) {
    const filled = (pos / 31) * 100
    const rocketLeft = Math.min(96, Math.max(4, filled))
    return (
      <div style={{ margin: '26px 0' }}>
        <div style={{ position: 'relative', height: 14, background: 'var(--void)', borderRadius: 999, border: '1px solid var(--panel-edge)', margin: '26px 0 8px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 999, width: `${filled}%`, background: 'linear-gradient(90deg, var(--nebula), var(--thruster))' }} />
          <div style={{ position: 'absolute', top: '50%', left: `${rocketLeft}%`, transform: 'translate(-50%,-50%)', fontSize: 22 }}>🚀</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--star-dim)', fontWeight: 600 }}>
          <span>SPACE {pos} / 31</span>
          <span>{laps} REACTOR{laps === 1 ? '' : 'S'} REMOVED FROM BOARD</span>
        </div>
      </div>
    )
  }

  if (loading) return <main className="app"><p style={{ color: 'var(--star-dim)', textAlign: 'center', marginTop: 80 }}>Loading...</p></main>
  if (error) return <main className="app"><div className="panel"><span className="eyebrow">Not Set Up Yet</span><h2>{error}</h2></div></main>

  if (sections.length > 1 && !selectedSection) {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Grade {gradeLevel} · {teacherName}</span>
          <h2>Which Class Is Up Today?</h2>
          <p className="sub">Pick a section to continue.</p>
          {sections.map(s => (
            <button key={s.id} className="btn btn-ghost btn-full" style={{ marginBottom: 12 }} onClick={() => selectSection(s, gradeLevel!)}>
              {s.label}
            </button>
          ))}
        </div>
      </main>
    )
  }

  const sectionTag = selectedSection && sections.length > 1 ? ` — ${selectedSection.label}` : ''

  if (alreadyDone && step === 'intro') {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Grade {gradeLevel} · {teacherName}{sectionTag}</span>
          <h2>Mission Day {question?.day_number} Complete ✅</h2>
          <div className="banner success">
            <span className="banner-title">ONE MISSION PER DAY</span>
            Today&apos;s answers are already locked in. Come back tomorrow for the next mission.
          </div>
        </div>
      </main>
    )
  }

  if (step === 'intro') {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Grade {gradeLevel} · {teacherName}{sectionTag}</span>
          <h2>Mission Day {question?.day_number}</h2>
          <p className="sub">Here&apos;s where your crew stands before today&apos;s launch.</p>
          <div className="stat-grid">
            <div className="stat-card"><div className="label">Class Average</div><div className="value good">{classAverage}%</div></div>
            <div className="stat-card"><div className="label">Best Score This Year</div><div className="value good">{selectedSection?.best_pct}%</div></div>
            <div className="stat-card"><div className="label">Today&apos;s Target Goal</div><div className="value warn">{school?.school_goal_pct}%</div></div>
          </div>
          {boardTrack(selectedSection?.board_pos || 0, selectedSection?.laps || 0)}
          <button className="btn btn-primary btn-full" onClick={() => setStep('question')}>Begin Today&apos;s Mission →</button>
        </div>
      </main>
    )
  }

  if (step === 'question' && question) {
    const choices: [string, string][] = [['A', question.choice_a], ['B', question.choice_b], ['C', question.choice_c], ['D', question.choice_d]]
    return (
      <main className="app" style={{ maxWidth: 1200 }}>
        <div className="panel">
          <span className="eyebrow" style={{ fontSize: 15 }}>Day {question.day_number} · Step 1 of 3</span>
          <h2 style={{ fontSize: 34 }}>Today&apos;s Question</h2>
          <p className="sub" style={{ fontSize: 16 }}>Read the question aloud, then have students hold up A, B, C, or D.</p>
          <div style={{ background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 16, padding: '32px 34px', marginBottom: 26, fontSize: 34, lineHeight: 1.4, fontWeight: 800 }}>
            {question.question_text}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
            {choices.map(([letter, text]) => (
              <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 14, padding: '24px 26px' }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, background: 'var(--panel-edge)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 700, fontSize: 24 }}>{letter}</div>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>{text}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setStep('tally')}>Students Have Answered — Enter Tally →</button>
        </div>
      </main>
    )
  }

  if (step === 'tally') {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Day {question?.day_number} · Step 2 of 3</span>
          <h2>Enter Today&apos;s Tally</h2>
          <p className="sub">This can only be submitted once per day.</p>
          {(['A', 'B', 'C', 'D', 'NA'] as const).map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 190, fontWeight: 700 }}>{k === 'NA' ? 'No answer' : `Choice ${k}`}</div>
              <input
                type="number" min={0} value={tally[k]}
                onChange={e => setTally({ ...tally, [k]: parseInt(e.target.value) || 0 })}
                style={{ width: 90, background: 'var(--void)', border: '1px solid var(--panel-edge)', borderRadius: 10, padding: '10px 12px', color: 'var(--star)', fontSize: 18, textAlign: 'center' }}
              />
            </div>
          ))}
          <button className="btn btn-primary btn-full" disabled={submitting} onClick={handleSubmitTally} style={{ marginTop: 14 }}>
            {submitting ? 'Submitting...' : 'Submit — Cannot Be Edited After This'}
          </button>
        </div>
      </main>
    )
  }

  if (step === 'video') {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Day {question?.day_number} · Step 3 of 3</span>
          <h2>Mission Briefing</h2>
          <p className="sub">Watch the video to learn today's correct answer and the strategy behind it.</p>
          <div style={{ aspectRatio: '16/9', borderRadius: 12, background: 'linear-gradient(135deg, #1c2452, #0d1130)', border: '1px solid var(--panel-edge)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, color: 'var(--star-dim)', fontSize: 13 }}>
            {question?.video_url ? <video src={question.video_url} controls style={{ width: '100%', height: '100%' }} /> : 'No video uploaded yet for this question'}
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setStep('results')}>Continue to Mission Results →</button>
        </div>
      </main>
    )
  }

  // results
  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Day {question?.day_number} · Results</span>
        <h2>Mission Results</h2>

        {moved ? (
          <div className="banner success">
            <span className="banner-title">🚀 GREAT WORK, CREW!</span>
            {grew && metGoal
              ? `Your crew scored above its own average (average was ${classAverage}%, today was ${pct}%) AND held the school goal!`
              : grew
              ? `Your crew scored above its own average today — average was ${classAverage}%, today was ${pct}%!`
              : 'Your crew held strong at or above the school goal!'}{' '}
            Move your game piece today!
            {isNewRecord && <span> 🎉 That&apos;s also a brand-new personal best!</span>}
          </div>
        ) : (
          <div className="banner encourage">
            <span className="banner-title">💪 KEEP GOING, CREW!</span>
            To move your game piece, your class needs to either score above its own average of {classAverage}% or reach the school goal of {school?.school_goal_pct}%. Get ready to try again tomorrow.
          </div>
        )}

        <div className="stat-grid">
          <div className="stat-card"><div className="label">Today&apos;s Score</div><div className="value">{pct}%</div></div>
          <div className="stat-card"><div className="label">Class Average</div><div className="value warn">{classAverage}%</div></div>
          <div className="stat-card"><div className="label">Best This Year{isNewRecord ? ' 🎉' : ''}</div><div className="value good">{selectedSection?.best_pct}%</div></div>
        </div>

        {boardTrack(selectedSection?.board_pos || 0, selectedSection?.laps || 0)}

        {reachedStar && (
          <div style={{ textAlign: 'center', padding: '28px 20px', borderRadius: 12, marginBottom: 20, background: 'radial-gradient(ellipse at center, rgba(139,111,240,.25), transparent 70%)', border: '1px solid var(--nebula)' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900, color: 'var(--solar)', marginBottom: 8 }}>🚀 MISSION CONTROL ACHIEVED 🚀</div>
            <p>Your class filled the board! Head to the Mission Control Hallway to claim your reactor magnet.</p>
          </div>
        )}
      </div>
    </main>
  )
}
