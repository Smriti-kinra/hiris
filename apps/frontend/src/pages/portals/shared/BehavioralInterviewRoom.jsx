import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../services/api'
import AppShell from '../../../components/AppShell'

const BEH_TRAITS = [
  'Communication', 'Leadership', 'Adaptability', 'Emotional Intelligence',
  'Collaboration', 'Integrity', 'Ownership', 'Cultural Alignment',
  'Decision Making', 'Conflict Resolution', 'Institutional Values Alignment',
  'Professionalism', 'Growth Mindset'
]

export default function BehavioralInterviewRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(0)
  const [notes, setNotes] = useState('')
  const [ratings, setRatings] = useState(BEH_TRAITS.reduce((acc, t) => ({ ...acc, [t]: 5 }), {}))
  const [recommendation, setRecommendation] = useState('neutral')
  const [ending, setEnding] = useState(false)

  // AI Questions (fetched from Gemini via backend)
  const [aiQuestions, setAiQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const isStartingRef = useRef(false)

  // Load session data
  useEffect(() => {
    apiFetch(`/interviews/${sessionId}`)
      .then(r => r.json())
      .then(d => {
        setSession(d)
        setLoading(false)
        // Pre-fetch AI questions for this candidate
        if (d.candidate_id) {
          fetchAIQuestions(d.candidate_id)
        }
      })
      .catch(() => navigate('/'))
  }, [sessionId, navigate])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-start recording when session loads
  useEffect(() => {
    if (session && !isRecording && !isStartingRef.current) {
      startRecording()
    }
    return () => {
      // Cleanup on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [session])

  const fetchAIQuestions = async (candidateId) => {
    setLoadingQuestions(true)
    try {
      const cached = await apiFetch(`/candidates/${candidateId}/questions`).then(r => r.json())
      if (cached && cached.length > 0) {
        setAiQuestions(cached.map(r => r.question))
      } else {
        setAiQuestions([])
      }
    } catch (err) {
      console.error('Failed to fetch AI questions:', err)
    }
    setLoadingQuestions(false)
  }

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

      recorder.start(1000) // Collect in 1-second chunks
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
        // Stop all tracks immediately
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

  const handleEndInterview = async () => {
    setEnding(true)
    const traits = Object.entries(ratings).map(([name, score]) => ({ name, score, is_ai: false }))

    try {
      // 1. Save manual evaluations
      await apiFetch(`/interviews/${sessionId}/evaluation`, {
        method: 'POST',
        body: JSON.stringify({ traits, notes, recommendation })
      })

      // 2. Stop recording and upload audio
      const audioBlob = await stopRecording()
      if (audioBlob && audioBlob.size > 0) {
        const formData = new FormData()
        formData.append('audio', audioBlob, `interview_${sessionId}.webm`)
        await apiFetch(`/interviews/${sessionId}/audio`, {
          method: 'POST',
          body: formData,
        })
      }

      // 3. End the session
      await apiFetch(`/interviews/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify({ duration_secs: timer })
      })

      // Backend now automatically handles Whisper transcription and subsequent AI evaluation.

      navigate(`/interview-room/summary/${sessionId}`)
    } catch (err) {
      alert('Failed to end interview.')
      setEnding(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>

  return (
    <AppShell portal="chro" pageTitle={`Behavioral Interview`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, height: 'calc(100vh - 140px)' }}>

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="avatar" style={{ width: 48, height: 48, background: '#7C3AED', color: '#fff' }}>{session?.candidate_name?.[0]}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{session?.candidate_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session?.job_title}</div>
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

          {/* AI Question Suggestions Panel */}
          <div className="card" style={{ background: '#F5F3FF', border: '1px solid #C4B5FD' }}>
            <div className="card-pad" style={{ borderBottom: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B21B6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#5B21B6' }}>AI Contextual Questions</div>
              <span style={{ fontSize: 11, color: '#7C3AED', marginLeft: 'auto' }}>Gemini-powered</span>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
              {loadingQuestions ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#6D28D9', fontSize: 13 }}>Generating candidate-specific questions...</div>
              ) : aiQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#6D28D9', fontSize: 13 }}>No questions generated yet.</div>
              ) : (
                aiQuestions.map((q, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', minWidth: 18, marginTop: 2 }}>{idx + 1}.</span>
                    <div
                      style={{ fontSize: 13, background: '#fff', border: '1px solid #DDD6FE', padding: '10px 14px', borderRadius: 10, color: '#4C1D95', flex: 1, cursor: 'default' }}
                    >
                      {q}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>


        </div>

        {/* Right Column: Evaluation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingRight: 4 }}>
          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Behavioral Ratings</div>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {BEH_TRAITS.map(t => (
                <div key={t}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t}</label>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6' }}>{ratings[t]}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={ratings[t]} onChange={e => setRatings({ ...ratings, [t]: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#5B21B6' }} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Final Decision</div>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea className="hiris-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Summary of behavioral fit..." />
              <select className="hiris-input" value={recommendation} onChange={e => setRecommendation(e.target.value)}>
                <option value="strong_hire">Strong Hire</option>
                <option value="hire">Hire</option>
                <option value="neutral">Neutral</option>
                <option value="no_hire">No Hire</option>
              </select>
              <button disabled={ending} onClick={handleEndInterview} className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 8, background: '#5B21B6', borderColor: '#5B21B6' }}>
                {ending ? 'Finishing...' : 'Complete Interview'}
              </button>
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
