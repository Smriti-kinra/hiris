import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../services/api'
import AppShell from '../../../components/AppShell'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'

const TECH_TRAITS = [
  'Problem Solving', 'System Design', 'Coding Ability', 'Technical Depth',
  'Communication Clarity', 'Debugging Approach', 'Scalability Thinking',
  'Data Structures & Algorithms', 'Technical Confidence', 'Technical Collaboration'
]

export default function TechnicalInterviewRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  // Faculty role detection — faculty do NOT have can_make_final_decision
  const isFaculty = !!(user?.permissions?.can_conduct_interview && !user?.permissions?.can_make_final_decision)

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [notes, setNotes] = useState('')
  const [ratings, setRatings] = useState(TECH_TRAITS.reduce((acc, t) => ({ ...acc, [t]: 5 }), {}))
  const [recommendation, setRecommendation] = useState('neutral')
  const [ending, setEnding] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // Audio recording
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const isStartingRef = useRef(false)

  const transcriptEndRef = useRef(null)

  useEffect(() => {
    apiFetch(`/interviews/${sessionId}`)
      .then(r => r.json())
      .then(d => {
        setSession(d)
        setLoading(false)
        // Load any previously saved notes
        return apiFetch(`/interviews/${sessionId}/reviewer-notes`).then(r => r.json())
      })
      .then(notesData => {
        if (notesData?.session_notes) {
          setNotes(notesData.session_notes)
        }
      })
      .catch(() => navigate('/'))
  }, [sessionId, navigate])

  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // Auto-start recording (only if microphone available)
  useEffect(() => {
    if (session && !isRecording && !isStartingRef.current) startRecording()
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [session])

  const startRecording = async () => {
    if (isStartingRef.current || mediaRecorderRef.current) return
    isStartingRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
    } finally {
      isStartingRef.current = false
    }
  }

  const stopRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null)
        return
      }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
        }
        setIsRecording(false)
        resolve(blob)
      }
      mediaRecorderRef.current.stop()
    })
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const rs = s % 60
    return `${m}:${rs.toString().padStart(2, '0')}`
  }

  const handleAddTranscript = (speaker, text) => {
    const newMsg = { speaker, text, timestamp: new Date().toISOString() }
    const updated = [...transcript, newMsg]
    setTranscript(updated)
    apiFetch(`/interviews/${sessionId}/transcript`, {
      method: 'PATCH',
      body: JSON.stringify({ transcript: updated })
    })
  }

  // ── Save Notes (mid-interview, no session end required) ──────────────────
  const handleSaveNotes = async () => {
    if (!notes || notes.trim().length === 0) {
      toast.error('Please write some notes before saving.')
      return
    }
    setSavingNotes(true)
    try {
      const res = await apiFetch(`/interviews/${sessionId}/reviewer-notes`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes.trim() })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save notes')
      }
      setNotesSaved(true)
      toast.success('Notes saved successfully!')
      setTimeout(() => setNotesSaved(false), 3000)
    } catch (err) {
      toast.error(err.message || 'Failed to save notes.')
    } finally {
      setSavingNotes(false)
    }
  }

  // ── End Interview ─────────────────────────────────────────────────────────
  const handleEndInterview = async () => {
    setEnding(true)
    const traits = Object.entries(ratings).map(([name, score]) => ({ name, score, is_ai: false }))

    try {
      await apiFetch(`/interviews/${sessionId}/evaluation`, {
        method: 'POST',
        body: JSON.stringify({ traits, notes, recommendation })
      })

      const audioBlob = await stopRecording()
      if (audioBlob && audioBlob.size > 0) {
        const formData = new FormData()
        formData.append('audio', audioBlob, `interview_${sessionId}.webm`)
        await apiFetch(`/interviews/${sessionId}/audio`, {
          method: 'POST',
          body: formData,
        })
      }

      await apiFetch(`/interviews/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify({ duration_secs: timer })
      })

      // Role-based redirect after ending interview:
      // Faculty → interview summary (to confirm proceed/reject) — no AI room
      // Others → standard summary with AI assessment
      if (isFaculty) {
        toast.success('Interview ended. Please review and proceed or reject the candidate.')
        navigate(`/interview-room/summary/${sessionId}`)
      } else {
        navigate(`/interview-room/summary/${sessionId}`)
      }
    } catch (err) {
      toast.error('Failed to end interview. Please try again.')
      setEnding(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>

  return (
    <AppShell portal={isFaculty ? 'faculty' : 'hiring'} pageTitle={`Technical Interview`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, height: 'calc(100vh - 140px)' }}>

        {/* Left Column: Live Room */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header Card */}
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="avatar" style={{ width: 48, height: 48 }}>{session?.candidate_name?.[0]}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{session?.candidate_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session?.job_title}</div>
                {isFaculty && (
                  <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, marginTop: 2, textTransform: 'uppercase' }}>
                    Technical Interview — Faculty Review
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>Recording</span>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: 'var(--brand)' }}>{formatTime(timer)}</div>
              </div>
            </div>
          </div>

          {/* Interview Notes Panel */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Interview Notes</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your observations will be saved to the candidate profile</div>
                </div>
                {notesSaved && (
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </span>
                )}
              </div>
              <div className="card-pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea
                  className="hiris-input"
                  rows={10}
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
                  placeholder="Write your observations about the candidate's technical performance, communication, problem-solving approach, etc..."
                  style={{ flex: 1, resize: 'vertical', minHeight: 200 }}
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || !notes.trim()}
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 600 }}
                >
                  {savingNotes ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Saving Notes...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Save Notes
                    </span>
                  )}
                </button>
              </div>
            </div>
        </div>

        {/* Right Column: Evaluation & Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingRight: 4 }}>

          {/* Manual Ratings */}
          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Technical Evaluation</div>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TECH_TRAITS.map(t => (
                <div key={t}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t}</label>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{ratings[t]}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={ratings[t]} onChange={e => setRatings({ ...ratings, [t]: parseInt(e.target.value) })} style={{ width: '100%', accentColor: 'var(--brand)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Final Verdict */}
          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Final Verdict</div>
              {isFaculty && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Your recommendation will be visible to the CHRO
                </div>
              )}
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Only show notes textarea in Final Verdict for non-faculty (faculty has dedicated panel) */}
              {!isFaculty && (
                <textarea className="hiris-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Summarize technical performance..." />
              )}
              <select className="hiris-input" value={recommendation} onChange={e => setRecommendation(e.target.value)}>
                <option value="strong_hire">Strong Hire</option>
                <option value="hire">Hire</option>
                <option value="neutral">Neutral</option>
                <option value="no_hire">No Hire</option>
              </select>
              <button disabled={ending} onClick={handleEndInterview} className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 8 }}>
                {ending ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    Ending Session...
                  </span>
                ) : 'End Interview'}
              </button>
              {isFaculty && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                  After ending, you can review and forward the candidate to the CHRO Final Interview.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </AppShell>
  )
}
