import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../services/api'
import AppShell from '../../../components/AppShell'
import { useAuth } from '../../../context/AuthContext'

function homeSection(user) {
  const section = (user?.home_path || '').match(/^\/([^/?#]+)/)?.[1]
  return ['hiring', 'faculty', 'chro'].includes(section) ? section : 'hiring'
}

export default function InterviewSummary() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [session, setSession] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [proceeding, setProceeding] = useState(false)

  useEffect(() => {
    apiFetch(`/interviews/${sessionId}`)
      .then(r => r.json())
      .then(s => {
        setSession(s)
        // Fetch evaluations from the candidate interview history
        return apiFetch(`/candidates/${s.candidate_id}/interviews`).then(r => r.json())
      })
      .then(history => {
        const current = history.find(h => String(h.id) === String(sessionId))
        if (current) setEvaluations(current.evaluations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId])

  const handleProceed = async () => {
    setProceeding(true)
    try {
      await apiFetch(`/interviews/${sessionId}/proceed`, { method: 'POST' })
      navigate(`/${homeSection(user)}/candidates`)
    } catch { setProceeding(false) }
  }

  const handleReject = async () => {
    setProceeding(true)
    try {
      await apiFetch(`/interviews/${sessionId}/reject`, { method: 'POST' })
      navigate(`/${homeSection(user)}/candidates`)
    } catch { setProceeding(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>
  if (!session) return <div className="empty-state">Session not found.</div>

  const humanEvals = evaluations.filter(e => !e.is_ai)
  const aiEvals = evaluations.filter(e => e.is_ai)
  const aiAnalysis = session.ai_analysis || {}

  const REC_LABEL = { strong_hire: 'Strong Hire', hire: 'Hire', neutral: 'Neutral', no_hire: 'No Hire' }
  const REC_COLOR = { strong_hire: '#10B981', hire: '#10B981', neutral: '#F59E0B', no_hire: '#EF4444' }

  return (
    <AppShell portal={homeSection(user)} pageTitle="Interview Summary">
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginBottom: 24, padding: '8px 16px', fontSize: 13 }}>
          Back to Interviews
        </button>

        {/* Summary Header */}
        <div className="card card-pad" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Interview Completed</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{session.candidate_name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{session.job_title} &middot; {session.type === 'technical' ? 'Technical Round' : 'Behavioral Round'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: REC_COLOR[session.recommendation] + '20', color: REC_COLOR[session.recommendation], border: `1px solid ${REC_COLOR[session.recommendation]}40` }}>
              {REC_LABEL[session.recommendation] || 'Pending'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Duration: {session.duration_secs ? `${Math.floor(session.duration_secs / 60)}m ${session.duration_secs % 60}s` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Proceed / Reject Buttons */}
        <div className="card card-pad" style={{ marginBottom: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button disabled={proceeding} onClick={handleProceed} className="btn btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>
            Proceed to Next Stage
          </button>
          <button disabled={proceeding} onClick={handleReject} className="btn btn-outline" style={{ padding: '10px 28px', fontSize: 14, color: '#EF4444', borderColor: '#EF4444' }}>
            Reject Application
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Human Trait Ratings */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Interviewer Ratings</div>
              </div>
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {humanEvals.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No human evaluations recorded.</div>
                ) : humanEvals.map(e => (
                  <div key={e.trait_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      <span>{e.trait_name}</span>
                      <span>{e.score}/10</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${e.score * 10}%`, background: 'var(--brand)', borderRadius: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Trait Ratings */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                <div style={{ fontWeight: 700, fontSize: 16 }}>AI Assessment</div>
              </div>
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {aiEvals.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>AI evaluation is processing or not yet available. Check back shortly.</div>
                ) : aiEvals.map(e => (
                  <div key={e.trait_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      <span>{e.trait_name}</span>
                      <span style={{ color: '#7C3AED' }}>{e.score}/10</span>
                    </div>
                    <div style={{ height: 6, background: '#EDE9FE', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${e.score * 10}%`, background: '#7C3AED', borderRadius: 10 }} />
                    </div>
                    {e.comments && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{e.comments}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>AI Summary</div>
              </div>
              <div className="card-pad" style={{ lineHeight: 1.6, fontSize: 14, color: 'var(--text-secondary)' }}>
                {session.ai_summary || 'AI analysis is processing. Please refresh in a moment.'}
              </div>
              {aiAnalysis.institutional_alignment && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Institutional Alignment</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{aiAnalysis.institutional_alignment}</div>
                </div>
              )}
              {aiAnalysis.strengths?.length > 0 && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', marginBottom: 6 }}>Strengths</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {aiAnalysis.strengths.map((s, i) => <li key={i} style={{ marginBottom: 4, color: 'var(--text-secondary)' }}>{s}</li>)}
                  </ul>
                </div>
              )}
              {aiAnalysis.concerns?.length > 0 && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', marginBottom: 6 }}>Concerns</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {aiAnalysis.concerns.map((s, i) => <li key={i} style={{ marginBottom: 4, color: 'var(--text-secondary)' }}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Transcript</div>
              </div>
              <div className="card-pad" style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-hover)' }}>
                {(session.transcript || []).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transcript recorded.</div>
                ) : (session.transcript || []).map((m, i) => (
                  <div key={i} style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: m.speaker === 'Candidate' ? 'var(--text-primary)' : 'var(--brand)', marginRight: 8 }}>{m.speaker}:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{m.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Interviewer Notes</div>
              </div>
              <div className="card-pad" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {session.interviewer_notes || 'No notes provided.'}
              </div>
            </div>

            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Session Metadata</div>
              </div>
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{session.started_at ? new Date(session.started_at).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recording</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: session.recording_path ? '#10B981' : 'var(--text-muted)' }}>
                    {session.recording_path ? 'Stored Securely' : 'No recording'}
                  </div>
                </div>
                {session.recording_path && (
                  <div>
                    <audio controls src={`/${session.recording_path}`} style={{ width: '100%', marginTop: 8 }} />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
