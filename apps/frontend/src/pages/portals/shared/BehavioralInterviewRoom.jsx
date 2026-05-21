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
  const [candidateProfile, setCandidateProfile] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // AI Questions (fetched from Gemini via backend)
  const [aiQuestions, setAiQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [askedQuestions, setAskedQuestions] = useState([])
  const [customQuestions, setCustomQuestions] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [copyingText, setCopyingText] = useState(null)
  const [customInput, setCustomInput] = useState('')

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
          apiFetch(`/candidates/${d.candidate_id}`)
            .then(r => r.ok ? r.json() : null)
            .then(setCandidateProfile)
            .catch(() => null)
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

  const appendToNotes = (qText) => {
    setNotes(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return qText;
      return `${trimmed}\n\n- ${qText}`;
    });
  }

  // Filter questions based on active tab and search term
  const allQuestions = [...aiQuestions, ...customQuestions]
  const filteredQuestions = allQuestions
    .filter(q => q.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(q => {
      if (activeTab === 'pending') return !askedQuestions.includes(q)
      if (activeTab === 'asked') return askedQuestions.includes(q)
      if (activeTab === 'custom') return customQuestions.includes(q)
      return true
    })

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

          <div className="card">
            <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Candidate Preview</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Compact context for the current interview.</div>
              </div>
              <button className="btn btn-outline" onClick={() => setPreviewOpen(open => !open)} style={{ fontSize: 12, padding: '8px 14px' }}>
                {previewOpen ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
            {previewOpen && (
              <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
                {candidateProfile ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Candidate</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{candidateProfile.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{candidateProfile.headline || candidateProfile.job_title || 'No headline available'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Stage</div>
                        <div style={{ fontWeight: 700, color: 'var(--brand)' }}>{candidateProfile.stage || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{candidateProfile.department || 'No department'}</div>
                      </div>
                    </div>
                    {candidateProfile.skills?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Skills</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {candidateProfile.skills.map(skill => (
                            <span key={skill} className="badge badge-gray" style={{ fontSize: 11 }}>{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidateProfile.score != null && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>AI Score</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: candidateProfile.score >= 80 ? 'var(--accent-green)' : candidateProfile.score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>{candidateProfile.score}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading candidate profile...</div>
                )}
              </div>
            )}
          </div>

          {/* Redesigned AI Questions Panel */}
          <div className="card ai-room-panel">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--ai-panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge-ai-sparkle">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  AI Generated
                </span>
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ai-panel-text)', letterSpacing: '-0.3px' }}>Contextual Questions</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Powered by Gemini</span>
            </div>

            <div className="card-pad" style={{ borderBottom: '1px solid var(--ai-panel-border)', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
              {/* Search Bar */}
              <div className="ai-search-wrapper">
                <svg className="ai-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search generated questions..."
                  className="hiris-input ai-search-input ai-input-glow"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Tabs */}
              <div className="ai-tabs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'asked', label: 'Asked' },
                  { id: 'custom', label: 'Custom' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`ai-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-pad ai-questions-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
              {loadingQuestions ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  <span>Generating candidate-specific questions...</span>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No questions found for this filter.
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isAsked = askedQuestions.includes(q);
                  const isCopying = copyingText === q;
                  const isCustom = customQuestions.includes(q);

                  return (
                    <div
                      key={idx}
                      className={`ai-question-card ${isAsked ? 'asked' : ''}`}
                    >
                      <div className="ai-circle-index">
                        {isCustom ? '✎' : idx + 1}
                      </div>
                      <div className="question-text" style={{ flex: 1 }}>
                        {q}
                      </div>
                      <div className="ai-card-actions">
                        {/* Toggle Asked Status */}
                        <button
                          type="button"
                          className="ai-micro-btn"
                          title={isAsked ? "Mark as Pending" : "Mark as Asked"}
                          onClick={() => {
                            if (isAsked) {
                              setAskedQuestions(prev => prev.filter(item => item !== q));
                            } else {
                              setAskedQuestions(prev => [...prev, q]);
                            }
                          }}
                        >
                          {isAsked ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>
                          )}
                        </button>

                        {/* Copy to Clipboard */}
                        <button
                          type="button"
                          className="ai-micro-btn"
                          title="Copy to clipboard"
                          onClick={() => {
                            navigator.clipboard.writeText(q);
                            setCopyingText(q);
                            setTimeout(() => setCopyingText(null), 2000);
                          }}
                        >
                          {isCopying ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          )}
                        </button>

                        {/* Append to Notes */}
                        <button
                          type="button"
                          className="ai-micro-btn"
                          title="Append to Notes"
                          onClick={() => appendToNotes(q)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom follow-up input */}
            <div className="card-pad" style={{ borderTop: '1px solid var(--ai-panel-border)', paddingTop: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Type a custom follow-up question..."
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  className="hiris-input ai-input-glow"
                  style={{ fontSize: 13, height: 38 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      e.preventDefault();
                      setCustomQuestions(prev => [...prev, customInput.trim()]);
                      setCustomInput('');
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    padding: '0 16px',
                    height: 38,
                    background: 'var(--ai-badge-text)',
                    borderColor: 'var(--ai-badge-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13
                  }}
                  onClick={() => {
                    if (customInput.trim()) {
                      setCustomQuestions(prev => [...prev, customInput.trim()]);
                      setCustomInput('');
                    }
                  }}
                >
                  Add
                </button>
              </div>
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
