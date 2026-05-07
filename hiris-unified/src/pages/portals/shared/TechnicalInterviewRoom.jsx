import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../services/api'
import AppShell from '../../../components/AppShell'

const TECH_TRAITS = [
  'Problem Solving', 'System Design', 'Coding Ability', 'Technical Depth',
  'Communication Clarity', 'Debugging Approach', 'Scalability Thinking',
  'Data Structures & Algorithms', 'Technical Confidence', 'Technical Collaboration'
]

export default function TechnicalInterviewRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [notes, setNotes] = useState('')
  const [ratings, setRatings] = useState(TECH_TRAITS.reduce((acc, t) => ({ ...acc, [t]: 5 }), {}))
  const [recommendation, setRecommendation] = useState('neutral')
  const [ending, setEnding] = useState(false)

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
      .then(d => { setSession(d); setLoading(false) })
      .catch(() => navigate('/'))
  }, [sessionId, navigate])

  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // Auto-start recording
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

      navigate(`/interview-room/summary/${sessionId}`)
    } catch (err) {
      alert('Failed to end interview.')
      setEnding(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>

  return (
    <AppShell portal="faculty" pageTitle={`Technical Interview`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, height: 'calc(100vh - 140px)' }}>

        {/* Left Column: Live Room & Transcription */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header Card */}
          <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="avatar" style={{ width: 48, height: 48 }}>{session?.candidate_name?.[0]}</div>
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

          {/* Transcript Area */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Live Transcript</div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{transcript.length} entries</span>
            </div>
            <div className="card-pad" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300 }}>
              {transcript.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Transcript will appear here once the conversation begins...
                </div>
              ) : (
                transcript.map((m, idx) => (
                  <div key={idx} style={{ alignSelf: m.speaker === 'Candidate' ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, textAlign: m.speaker === 'Candidate' ? 'left' : 'right' }}>{m.speaker}</div>
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: m.speaker === 'Candidate' ? '#fff' : 'var(--brand)', color: m.speaker === 'Candidate' ? 'var(--text-primary)' : '#fff', fontSize: 13, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
            <div className="card-pad" style={{ borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <input className="hiris-input" placeholder="Candidate says..." onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleAddTranscript('Candidate', e.target.value); e.target.value = '' } }} />
              <input className="hiris-input" placeholder="Your response..." style={{ borderColor: 'var(--brand)' }} onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleAddTranscript('Interviewer', e.target.value); e.target.value = '' } }} />
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

          {/* Notes & Recommendation */}
          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Final Verdict</div>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea className="hiris-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Summarize technical performance..." />
              <select className="hiris-input" value={recommendation} onChange={e => setRecommendation(e.target.value)}>
                <option value="strong_hire">Strong Hire</option>
                <option value="hire">Hire</option>
                <option value="neutral">Neutral</option>
                <option value="no_hire">No Hire</option>
              </select>
              <button disabled={ending} onClick={handleEndInterview} className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: 8 }}>
                {ending ? 'Ending Session...' : 'End Interview'}
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
