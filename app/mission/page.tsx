'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
}

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

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (tErr || !teacher) {
      setError('No teacher record is linked to this account yet.')
      setLoading(false)
      return
    }

    setTeacherName(teacher.name)
    setGradeLevel(teacher.grade_level)

    const { data: secs, error: sErr } = await supabase
      .from('sections')
      .select('*')
      .eq('teacher_id', teacher.id)

    if (sErr || !secs || secs.length === 0) {
      setError('No classes are set up for this teacher yet — a row needs to be added to the sections table.')
      setLoading(false)
      return
    }

    setSections(secs)

    if (secs.length === 1) {
      await selectSection(secs[0], teacher.grade_level)
    } else {
      setLoading(false)
    }
  }

  async function selectSection(section: Section, grade: number) {
    setLoading(true)
    setSelectedSection(section)

    const { data: schoolData, error: schErr } = await supabase
      .from('schools')
      .select('id, school_goal_pct, current_day_index')
      .eq('id', section.school_id)
      .single()

    if (schErr || !schoolData) {
      setError('Could not load school settings.')
      setLoading(false)
      return
    }
    setSchool(schoolData)

    const todaysDayNumber = schoolData.current_day_index + 1

    const { data: q, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('grade_level', grade)
      .eq('day_number', todaysDayNumber)
      .single()

    if (qErr || !q) {
      setError(`No question is loaded yet for Grade ${grade}, Day ${todaysDayNumber}. Add one to the questions table to test this screen.`)
      setLoading(false)
      return
    }
    setQuestion(q)

    const { data: existing } = await supabase
      .from('daily_history')
      .select('*')
      .eq('section_id', section.id)
      .eq('day_number', q.day_number)
      .maybeSingle()

    setAlreadyDone(!!existing && !existing.missed)
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="app">
        <p style={{ color: 'var(--star-dim)', textAlign: 'center', marginTop: 80 }}>Loading...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Not Set Up Yet</span>
          <h2>{error}</h2>
        </div>
      </main>
    )
  }

  // Multiple sections and none picked yet — show the class picker
  if (sections.length > 1 && !selectedSection) {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Grade {gradeLevel} · {teacherName}</span>
          <h2>Which Class Is Up Today?</h2>
          <p className="sub">Pick a section to continue — each one tracks its own best score and game piece.</p>
          {sections.map(s => (
            <button
              key={s.id}
              className="btn btn-ghost btn-full"
              style={{ marginBottom: 12 }}
              onClick={() => selectSection(s, gradeLevel!)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </main>
    )
  }

  const sectionTag = selectedSection && sections.length > 1 ? ` — ${selectedSection.label}` : ''

  if (alreadyDone) {
    return (
      <main className="app">
        <div className="panel">
          <span className="eyebrow">Grade {gradeLevel} · {teacherName}{sectionTag}</span>
          <h2>Mission Day {question?.day_number} Complete ✅</h2>
          <div className="banner success">
            <span className="banner-title">ONE MISSION PER DAY</span>
            Today&apos;s answers are already locked in — great work! Come back tomorrow for the next mission.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app">
      <div className="panel">
        <span className="eyebrow">Grade {gradeLevel} · {teacherName}{sectionTag}</span>
        <h2>Mission Day {question?.day_number}</h2>
        <p className="sub">Here&apos;s where your crew stands before today&apos;s launch.</p>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Best Score This Year</div>
            <div className="value good">{selectedSection?.best_pct}%</div>
          </div>
          <div className="stat-card">
            <div className="label">Today&apos;s Target Goal</div>
            <div className="value warn">{school?.school_goal_pct}%</div>
          </div>
        </div>

        <button className="btn btn-primary btn-full" disabled>
          Begin Today&apos;s Mission → (question/tally screens coming next session)
        </button>
      </div>
    </main>
  )
}
