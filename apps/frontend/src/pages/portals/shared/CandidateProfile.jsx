import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch, assetUrl } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const STAGE_BADGE = {
  'Applied':              'badge-gray',
  'Under Review':         'badge-amber',
  'Technical Interview':  'badge-blue',
  'Behavioral Interview': 'badge-purple',
  'Final Review':         'badge-green',
  'Offered':              'badge-green',
  'Rejected':             'badge-red',
}

const STAGE_FLOW = ['applied', 'under_review', 'technical_interview', 'behavioral_interview', 'final_review', 'offered']

function ScoreBar({ label, value }) {
  const pct = Math.round((value / 100) * 100)
  const color = value >= 80 ? 'var(--accent-green)' : value >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-secondary)' }}>
        <span>{label}</span><span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function SectionCard({ icon, title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{title}</div>
      </div>
      <div className="card-pad">{children}</div>
    </div>
  )
}

export default function CandidateProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const section = (user?.home_path || '').match(/^\/([^/?#]+)/)?.[1]
  const portal = ['hiring', 'faculty', 'chro'].includes(section) ? section : 'hiring'
  const noteField = (user?.permissions?.can_review_jd || user?.permissions?.can_conduct_interview) ? 'faculty_notes' : 'manager_notes'

  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [movingStage, setMovingStage] = useState(false)
  const [startingInterview, setStartingInterview] = useState(false)
  const [interviews, setInterviews] = useState([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      apiFetch(`/candidates/${id}`).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      apiFetch(`/candidates/${id}/interviews`).then(r => r.ok ? r.json() : [])
    ])
    .then(([candData, intData]) => {
      setCandidate(candData)
      setInterviews(intData)
      const existingNote = candData[noteField]
      setNoteText(existingNote || '')
    })
    .catch(err => setError(err === 404 ? 'Candidate not found.' : 'Failed to load profile.'))
    .finally(() => setLoading(false))
  }, [id, noteField])

  const handleSaveNote = async () => {
    setSavingNote(true)
    await apiFetch(`/candidates/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes: noteText }) }).catch(() => {})
    setSavingNote(false)
  }

  const handleMoveStage = async (newStageRaw) => {
    setMovingStage(true)
    const res = await apiFetch(`/candidates/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage: newStageRaw }) })
    if (res.ok) {
      const STAGE_MAP = {
        applied:              'Applied',
        under_review:         'Under Review',
        technical_interview:  'Technical Interview',
        behavioral_interview: 'Behavioral Interview',
        final_review:         'Final Review',
        offered:              'Offered',
        rejected:             'Rejected'
      }
      setCandidate(prev => ({ ...prev, stage: STAGE_MAP[newStageRaw], stage_raw: newStageRaw }))
    }
    setMovingStage(false)
  }

  // Start a live interview session from the candidate profile
  const handleStartInterview = async (type) => {
    if (!candidate?.application_id) return
    setStartingInterview(true)
    try {
      const res = await apiFetch('/interviews/start', {
        method: 'POST',
        body: JSON.stringify({ application_id: candidate.application_id, type })
      })
      if (res.ok) {
        const { id: sessionId } = await res.json()
        navigate(`/interview-room/${type}/${sessionId}`)
      } else {
        const d = await res.json()
        alert(d?.error || 'Failed to start interview session.')
      }
    } catch (e) {
      alert('Network error starting interview.')
    } finally {
      setStartingInterview(false)
    }
  }

  const initials = candidate?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const edu = candidate?.education || []
  const exp = candidate?.experience || []
  const skills = candidate?.skills || []
  const transcript = candidate?.chatbot_transcript || []
  const answers = candidate?.custom_answers || []
  const evalScores = candidate?.eval_scores || {}
  const generatedQuestions = candidate?.generated_behavioral_questions || []
  const currentStageIdx = STAGE_FLOW.indexOf(candidate?.stage_raw || 'applied')
  const canMoveCandidates = !!(user?.permissions?.can_move_candidates || user?.permissions?.is_admin)
  // Role capabilities — derived from permissions, not hardcoded
  const canConductInterview = !!(user?.permissions?.can_conduct_interview)
  const canFinalDecide      = !!(user?.permissions?.can_make_final_decision || user?.permissions?.is_admin)

  if (loading) return (
    <AppShell portal={portal} pageTitle="Candidate Profile">
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>
    </AppShell>
  )

  if (error) return (
    <AppShell portal={portal} pageTitle="Candidate Profile">
      <div className="empty-state" style={{ color: 'var(--accent-red)' }}>{error}</div>
    </AppShell>
  )

  return (
    <AppShell portal={portal} pageTitle={`${candidate.name} — Profile`}>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginBottom: 20, padding: '6px 14px', fontSize: 13 }}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT SIDEBAR ── */}
        <div>
          {/* Avatar Card */}
          <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
            <div className="card-pad">
              <div className="avatar" style={{ width: 72, height: 72, fontSize: 26, margin: '0 auto 12px' }}>{initials}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>{candidate.name}</div>
              {candidate.headline && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{candidate.headline}</div>}
              <span className={`badge ${STAGE_BADGE[candidate.stage] || 'badge-gray'}`}>{candidate.stage}</span>
              {candidate.score != null && (
                <div style={{ marginTop: 14, fontSize: 28, fontWeight: 800, color: candidate.score >= 75 ? 'var(--accent-green)' : candidate.score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                  {candidate.score}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>/100</span>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>AI Score</div>
            </div>
          </div>

          {/* Contact */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-pad">
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Contact</div>
              {[
                { icon: '✉️', val: candidate.email },
                { icon: '📞', val: candidate.phone || '—' },
                { icon: '📍', val: candidate.location || '—' },
                { icon: '🔗', val: candidate.source },
              ].map(({ icon, val }) => (
                <div key={icon} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span>{icon}</span>
                  <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Application Info */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-pad">
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Application</div>
              {[
                { label: 'Role', val: candidate.role || '—' },
                { label: 'Department', val: candidate.department || '—' },
                { label: 'Applied', val: candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                { label: 'Ref ID', val: `#APP-${candidate.application_id || candidate.id}` },
              ].map(({ label, val }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-pad">
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {skills.map(s => <span key={s} className="badge badge-gray" style={{ fontSize: 11 }}>{s}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-pad">
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Documents</div>
              {candidate.resume_path && (
                <a href={assetUrl(candidate.resume_path)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 8, marginBottom: 8, textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Resume
                </a>
              )}
              {candidate.cv_path && (
                <a href={assetUrl(candidate.cv_path)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 8, textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Curriculum Vitae
                </a>
              )}
              {!candidate.resume_path && !candidate.cv_path && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No documents uploaded.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT MAIN ── */}
        <div>
          {/* Pipeline Progress */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-pad">
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Hiring Pipeline</div>
              <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
                {STAGE_FLOW.map((s, i) => {
                  const label = {
                    applied:              'Applied',
                    under_review:         'Review',
                    technical_interview:  'Technical',
                    behavioral_interview: 'Behavioral',
                    final_review:         'Final',
                    offered:              'Offered'
                  }[s]
                  const done = i <= currentStageIdx
                  return (
                    <div key={s} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      {i > 0 && <div style={{ position: 'absolute', top: 15, left: 0, right: '50%', height: 2, background: done ? 'var(--brand)' : 'var(--border)' }} />}
                      {i < STAGE_FLOW.length - 1 && <div style={{ position: 'absolute', top: 15, left: '50%', right: 0, height: 2, background: i < currentStageIdx ? 'var(--brand)' : 'var(--border)' }} />}
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: done ? 'var(--brand)' : 'var(--bg-input)', border: `2px solid ${done ? 'var(--brand)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', position: 'relative', zIndex: 1 }}>
                        {done ? <span style={{ color: 'white', fontSize: 14 }}>✓</span> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', display: 'block' }} />}
                      </div>
                      <div style={{ fontSize: 10, color: done ? 'var(--brand)' : 'var(--text-muted)', fontWeight: done ? 700 : 400 }}>{label}</div>
                    </div>
                  )
                })}
              </div>

              {/* Stage Action Buttons — role-aware */}
              {candidate.stage !== 'Rejected' && candidate.stage !== 'Offered' && (
                <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                  {/* Hiring Manager: move applied → under_review, or under_review → technical_interview */}
                  {canMoveCandidates && (candidate.stage_raw === 'applied' || candidate.stage_raw === 'under_review') && (
                    <>
                      <button
                        disabled={movingStage}
                        onClick={() => handleMoveStage(STAGE_FLOW[currentStageIdx + 1])}
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: 12 }}
                      >
                        {candidate.stage_raw === 'applied' ? 'Move to Review' : 'Send to Technical Interview'}
                      </button>
                      <button
                        disabled={movingStage}
                        onClick={() => handleMoveStage('rejected')}
                        className="btn btn-outline"
                        style={{ padding: '6px 16px', fontSize: 12, color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {/* Faculty: start technical interview when candidate is in technical_interview stage */}
                  {canConductInterview && candidate.stage_raw === 'technical_interview' && (
                    <button
                      disabled={startingInterview}
                      onClick={() => handleStartInterview('technical')}
                      className="btn btn-primary"
                      style={{ padding: '6px 16px', fontSize: 12 }}
                    >
                      {startingInterview ? 'Starting…' : '▶ Start Technical Interview'}
                    </button>
                  )}

                  {/* CHRO: start behavioral interview, or make final offer / reject from final_review */}
                  {canConductInterview && candidate.stage_raw === 'behavioral_interview' && (
                    <button
                      disabled={startingInterview}
                      onClick={() => handleStartInterview('behavioral')}
                      className="btn btn-primary"
                      style={{ padding: '6px 16px', fontSize: 12 }}
                    >
                      {startingInterview ? 'Starting…' : '▶ Start Behavioral Interview'}
                    </button>
                  )}
                  {canMoveCandidates && candidate.stage_raw === 'final_review' && (
                    <>
                      <button
                        disabled={movingStage}
                        onClick={() => handleMoveStage('offered')}
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: 12 }}
                      >
                        Make Offer
                      </button>
                      <button
                        disabled={movingStage}
                        onClick={() => handleMoveStage('rejected')}
                        className="btn btn-outline"
                        style={{ padding: '6px 16px', fontSize: 12, color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                      >
                        Reject
                      </button>
                    </>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {candidate.ai_summary && (
            <SectionCard icon="🤖" title="AI Evaluation Summary">
              <div style={{ background: 'var(--brand-light)', border: '1px solid var(--brand)', borderRadius: 10, padding: 16, fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {candidate.ai_summary}
              </div>
            </SectionCard>
          )}

          {/* Eval Scores */}
          {Object.keys(evalScores).length > 0 && (
            <SectionCard icon="📊" title="Evaluation Scores">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                {Object.entries(evalScores).map(([k, v]) => (
                  <ScoreBar key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={Number(v)} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Education */}
          {edu.length > 0 && (
            <SectionCard icon="🎓" title="Education">
              {edu.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < edu.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.degree}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.institution}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>{e.grade}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.year}</div>
                  </div>
                </div>
              ))}
            </SectionCard>
          )}

          {/* Experience */}
          {exp.length > 0 && (
            <SectionCard icon="💼" title="Work Experience">
              {exp.map((e, i) => (
                <div key={i} style={{ paddingBottom: i < exp.length - 1 ? 16 : 0, marginBottom: i < exp.length - 1 ? 16 : 0, borderBottom: i < exp.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.role}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.duration}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 4 }}>{e.company}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.desc}</div>
                </div>
              ))}
            </SectionCard>
          )}

          {/* Q&A */}
          {answers.length > 0 && (
            <SectionCard icon="📝" title="Application Questions & Answers">
              {answers.map((qa, i) => (
                <div key={i} style={{ marginBottom: i < answers.length - 1 ? 20 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Q{i + 1}. {qa.question}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: 12, borderRadius: 8, lineHeight: 1.6 }}>{qa.answer}</div>
                </div>
              ))}
            </SectionCard>
          )}

          {/* Chatbot Transcript */}
          {transcript.length > 0 && (
            <SectionCard icon="💬" title="AI Pre-Screening Chat">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {transcript.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ alignSelf: 'flex-start', background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '4px 16px 16px 16px', fontSize: 13, lineHeight: 1.6, maxWidth: '85%' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>Bot</div>
                      {msg.question}
                    </div>
                    <div style={{ alignSelf: 'flex-end', background: 'var(--brand)', color: 'white', padding: '10px 14px', borderRadius: '16px 4px 16px 16px', fontSize: 13, lineHeight: 1.6, maxWidth: '85%' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>Candidate</div>
                      {msg.answer}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Generated Questions */}
          {generatedQuestions.length > 0 && (
            <SectionCard icon="💡" title="Generated Behavioral Questions">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                These questions were generated contextually based on the candidate's resume, CV, and AI chat answers.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {generatedQuestions.map((q, i) => (
                  <div key={i} style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--brand)', marginRight: 6 }}>Q{i+1}.</span> {q}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Interview Summaries */}
          {interviews.map(int => {
            const humanEvals = int.evaluations?.filter(e => !e.is_ai) || []
            const aiEvals = int.evaluations?.filter(e => e.is_ai) || []
            const analysis = int.ai_analysis || {}
            return (
            <SectionCard 
              key={int.id} 
              icon={int.type === 'technical' ? '💻' : '🤝'} 
              title={`${int.type === 'technical' ? 'Technical' : 'Behavioral'} Interview Summary`}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Interviewer Ratings</div>
                  {humanEvals.map(e => (
                    <div key={e.trait_name} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>{e.trait_name}</span>
                        <span style={{ fontWeight: 700 }}>{e.score}/10</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${e.score * 10}%`, background: 'var(--brand)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 8 }}>AI Ratings</div>
                  {aiEvals.length > 0 ? aiEvals.map(e => (
                    <div key={e.trait_name} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>{e.trait_name}</span>
                        <span style={{ fontWeight: 700, color: '#7C3AED' }}>{e.score}/10</span>
                      </div>
                      <div style={{ height: 4, background: '#EDE9FE', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${e.score * 10}%`, background: '#7C3AED' }} />
                      </div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>AI analysis pending...</div>
                  )}
                </div>
              </div>
              <div style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Interviewer Feedback</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{int.interviewer_notes || 'No comments provided.'}"</div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="badge badge-green" style={{ fontSize: 10 }}>{int.recommendation?.replace('_', ' ').toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>By {int.interviewer_name}</div>
                </div>
              </div>
              {int.ai_summary && (
                <div style={{ background: 'var(--brand-light)', border: '1px solid var(--brand)', borderRadius: 10, padding: 12, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--brand)', marginBottom: 4 }}>AI Assessment Summary</div>
                  {int.ai_summary}
                </div>
              )}
              {analysis.strengths?.length > 0 && (
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#10B981' }}>Strengths: </span>
                  {analysis.strengths.join(' · ')}
                </div>
              )}
              {analysis.concerns?.length > 0 && (
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#F59E0B' }}>Concerns: </span>
                  {analysis.concerns.join(' · ')}
                </div>
              )}
              {int.recording_path && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Recording</div>
                  <audio controls src={assetUrl(int.recording_path)} style={{ width: '100%' }} />
                </div>
              )}
            </SectionCard>
            )
          })}

          {/* Notes */}
          <SectionCard icon="🗒️" title="Reviewer Notes">
            <textarea
              className="hiris-input"
              rows={4}
              style={{ resize: 'vertical', marginBottom: 10 }}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={`Add your private notes about ${candidate.name}...`}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button disabled={savingNote} onClick={handleSaveNote} className="btn btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>
                {savingNote ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  )
}
