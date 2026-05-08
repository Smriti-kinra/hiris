import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../services/api'
import AppShell from '../../../components/AppShell'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'

function homeSection(user) {
  const section = (user?.home_path || '').match(/^\/([^/?#]+)/)?.[1]
  return ['hiring', 'faculty', 'chro'].includes(section) ? section : 'hiring'
}

export default function InterviewSummary() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  // Faculty: has can_conduct_interview but NOT can_make_final_decision
  const isFaculty = !!(user?.permissions?.can_conduct_interview && !user?.permissions?.can_make_final_decision)
  const portal = homeSection(user)

  const [session, setSession] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [reviewerNotes, setReviewerNotes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [proceeding, setProceeding] = useState(false)

  useEffect(() => {
    apiFetch(`/interviews/${sessionId}`)
      .then(r => r.json())
      .then(s => {
        setSession(s)
        return Promise.all([
          apiFetch(`/candidates/${s.candidate_id}/interviews`).then(r => r.json()),
          apiFetch(`/interviews/${sessionId}/reviewer-notes`).then(r => r.json()).catch(() => null)
        ])
      })
      .then(([history, notesData]) => {
        const current = history.find(h => String(h.id) === String(sessionId))
        if (current) setEvaluations(current.evaluations || [])
        if (notesData) setReviewerNotes(notesData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId])

  const handleProceed = async () => {
    setProceeding(true)
    try {
      const res = await apiFetch(`/interviews/${sessionId}/proceed`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to proceed')

      console.log(`[SUMMARY] Candidate proceeded to stage: ${data.new_stage}`)

      if (isFaculty) {
        toast.success(`Candidate forwarded to CHRO Final Interview! Stage: ${data.new_stage.replace(/_/g, ' ')}`)
        navigate(`/${portal}/candidates`)
      } else {
        toast.success('Candidate moved to next stage successfully.')
        navigate(`/${portal}/candidates`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to proceed candidate.')
      setProceeding(false)
    }
  }

  const handleReject = async () => {
    setProceeding(true)
    try {
      const res = await apiFetch(`/interviews/${sessionId}/reject`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reject')
      toast.info('Candidate application rejected.')
      navigate(`/${portal}/candidates`)
    } catch (err) {
      toast.error(err.message || 'Failed to reject candidate.')
      setProceeding(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>
  if (!session) return <div className="empty-state">Session not found.</div>

  const humanEvals = evaluations.filter(e => !e.is_ai)
  const aiEvals = evaluations.filter(e => e.is_ai)
  const aiAnalysis = session.ai_analysis || {}

  const REC_LABEL = { strong_hire: 'Strong Hire', hire: 'Hire', neutral: 'Neutral', no_hire: 'No Hire' }
  const REC_COLOR = { strong_hire: '#10B981', hire: '#10B981', neutral: '#F59E0B', no_hire: '#EF4444' }

  const notesText = reviewerNotes?.session_notes || session.interviewer_notes

  const renderMarkdown = (text) => {
    if (!text) return ''
    const escape = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return escape
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^(#{1,3})\s*(.+)$/gm, (_, hashes, content) => {
        const size = hashes.length === 1 ? '18px' : hashes.length === 2 ? '16px' : '14px'
        return `<div style="font-size:${size};font-weight:700;margin:14px 0 6px;">${content}</div>`
      })
      .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.+<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <AppShell portal={portal} pageTitle="Interview Summary">
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginBottom: 24, padding: '8px 16px', fontSize: 13 }}>
          Back
        </button>

        {/* Summary Header */}
        <div className="card card-pad" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Interview Completed</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{session.candidate_name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{session.job_title} · {session.type === 'technical' ? 'Technical Round' : 'Behavioral Round'}</div>
            {isFaculty && session.type === 'technical' && (
              <div style={{ marginTop: 8, padding: '6px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8', fontWeight: 600, display: 'inline-block' }}>
                Faculty Review — Proceed will move candidate to CHRO Final Interview
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: (REC_COLOR[session.recommendation] || '#94A3B8') + '20', color: REC_COLOR[session.recommendation] || '#94A3B8', border: `1px solid ${(REC_COLOR[session.recommendation] || '#94A3B8')}40` }}>
              {REC_LABEL[session.recommendation] || 'Pending'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Duration: {session.duration_secs ? `${Math.floor(session.duration_secs / 60)}m ${session.duration_secs % 60}s` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Proceed / Reject Buttons */}
        <div className="card card-pad" style={{ marginBottom: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button disabled={proceeding} onClick={handleProceed} className="btn btn-primary" style={{ padding: '10px 28px', fontSize: 14 }}>
            {proceeding ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Processing...
              </span>
            ) : isFaculty ? 'Forward to CHRO Final Interview' : 'Proceed to Next Stage'}
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

            {/* AI Assessment — hidden for faculty role */}
            {!isFaculty && (
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
            )}

            {/* AI Summary — hidden for faculty role */}
            {!isFaculty && (
              <div className="card">
                <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>AI Summary</div>
                </div>
                <div className="card-pad" style={{ lineHeight: 1.6, fontSize: 14, color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: session.ai_summary ? renderMarkdown(session.ai_summary) : 'AI analysis is processing. Please refresh in a moment.' }} />
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
            )}

          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Interviewer Notes</div>
              </div>
              <div className="card-pad" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {notesText || 'No notes provided.'}
              </div>
              {reviewerNotes?.reviewer_notes?.length > 0 && (
                <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>All Reviewer Notes</div>
                  {reviewerNotes.reviewer_notes.map((rn, i) => (
                    <div key={rn.id || i} style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand)', marginBottom: 4 }}>{rn.reviewer_name || 'Reviewer'}</div>
                      <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{rn.notes}</div>
                    </div>
                  ))}
                </div>
              )}
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interview Type</div>
                  <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{session.type || '—'}</div>
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
