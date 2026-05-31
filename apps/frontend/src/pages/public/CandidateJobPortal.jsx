import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, safeJson } from '../../services/api'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const DEFAULT_CHAT_QUESTIONS = [
  "Why do you want to apply to this organization?",
  "How would you contribute to our community?",
  "What differentiates you from other candidates?"
]

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export default function CandidateJobPortal() {
  const { token } = useParams()
  const [job, setJob] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', linkedin: '', github: '' })
  const [answers, setAnswers] = useState({})
  
  const [resumeFile, setResumeFile] = useState(null)
  const [cvFile, setCvFile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // AI Chat State
  const [chatStep, setChatStep] = useState(0)
  const [chatAnswers, setChatAnswers] = useState([])
  const [currentChatInput, setCurrentChatInput] = useState('')

  const chatQuestions = job?.chat_questions || DEFAULT_CHAT_QUESTIONS

  const questions = useMemo(() => Array.isArray(job?.questions) ? job.questions : [], [job])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    apiFetch(`/jobs/public/${token}`)
      .then(safeJson)
      .then(data => {
        if (!data) throw new Error('Invalid response from server')
        if (data.error) throw new Error(data.error)
        if (mounted) setJob(data)
      })
      .catch(err => { if (mounted) setError(err.message) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [token])

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleChatSubmit = (e) => {
    if (e) e.preventDefault()
    if (!currentChatInput.trim()) return
    const newAnswers = [...chatAnswers, { question: chatQuestions[chatStep], answer: currentChatInput }]
    setChatAnswers(newAnswers)
    setCurrentChatInput('')
    setChatStep(prev => prev + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const reqs = job.jd_json?.requirements || { name: true, email: true, resume: true }
    
    if (reqs.name && !form.name.trim()) return setError('Full Name is required.')
    if (reqs.email && !form.email.trim()) return setError('Email is required.')
    if (reqs.resume && !resumeFile) return setError('Resume is required.')
    if (reqs.cv && !cvFile) return setError('CV is required.')
    if (reqs.linkedin && !form.linkedin.trim()) return setError('LinkedIn URL is required.')
    if (reqs.github && !form.github.trim()) return setError('GitHub URL is required.')
    if (chatStep < chatQuestions.length) {
      setError('Please complete the AI chat questions before submitting.')
      return
    }

    setSubmitting(true)
    setError('')
    
    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('email', form.email)
    formData.append('phone', form.phone)
    formData.append('linkedin', form.linkedin)
    formData.append('github', form.github)
    formData.append('resume_file', resumeFile)
    formData.append('cv_file', cvFile)
    formData.append('ai_chat_answers', JSON.stringify(chatAnswers))
    formData.append('form_answers', JSON.stringify(questions.map((q, i) => ({ question: q.text, answer: answers[q.id || i] || '' }))))

    try {
      const response = await apiFetch(`/jobs/public/${token}/apply`, {
        method: 'POST',
        body: formData,
      })
      const data = await safeJson(response)
      if (!response.ok) throw new Error(data?.error || 'Could not submit application')
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slate-50)' }}>
      <div className="spinner" />
    </div>
  )
  
  if (error && !job) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
        <Navbar hideNavItems />
        <main style={{ padding: '140px 24px', display: 'grid', placeItems: 'center' }}>
          <div className="card" style={{ maxWidth: 480, textAlign: 'center', padding: 40 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--slate-300)', marginBottom: 20 }}>event_busy</span>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Position Unavailable</h1>
            <p style={{ color: 'var(--slate-500)', lineHeight: 1.6 }}>{error}</p>
            <a href="/" className="btn btn-primary" style={{ marginTop: 24 }}>Back to Home</a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'var(--font-body)' }}>
      <Navbar hideNavItems />
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0F172A 0%, #1e3a4a 55%, #28666E 100%)',
        paddingTop: 80, paddingBottom: 80, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div className="badge" style={{ background: 'rgba(40,102,110,0.25)', color: '#7ecdd4', borderColor: 'rgba(40,102,110,0.4)' }}>
              {job.department}
            </div>
            <div className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
              {job.job_type}
            </div>
          </div>
          
          <h1 style={{ color: 'white', fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.1, marginBottom: 20, maxWidth: 800 }}>
            {job.title}
          </h1>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>location_on</span>
              {job.location || 'Remote'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_today</span>
              Posted {job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'recently'}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="container" style={{ marginTop: -40, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        {success ? (
          <div className="card" style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--teal-10)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40 }}>check_circle</span>
            </div>
            <h2 style={{ fontSize: 28, marginBottom: 16 }}>Application Submitted!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
              Thank you for applying for the <strong>{job.title}</strong> position. Our hiring team will review your profile and get back to you via email.
            </p>
            <div style={{ marginTop: 20, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.7 }}>
              Your application has been received. We will contact you by email with the next steps.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'start' }}>
          
          {/* Job Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>description</span>
                Role Overview
              </h2>
              <div 
                style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8 }} 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.jd_json?.summary || job.summary) || 'No summary provided.' }} 
              />
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>assignment</span>
                Key Responsibilities
              </h2>
              <div 
                className="job-html-content"
                style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8 }} 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.responsibilities) || 'Shared during the interview process.' }} 
              />
            </div>

            {job.jd_json?.jobRequirements && (
              <div className="card" style={{ padding: 32 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>fact_check</span>
                  Job Requirements
                </h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {job.jd_json.jobRequirements}
                </div>
              </div>
            )}

            {job.jd_json?.preferredQualifications && (
              <div className="card" style={{ padding: 32 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>star</span>
                  Preferred Qualifications
                </h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {job.jd_json.preferredQualifications}
                </div>
              </div>
            )}

            {job.skills?.length > 0 && (
              <div className="card" style={{ padding: 32 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>verified</span>
                  Required Skills
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {job.skills.map(skill => (
                    <span key={skill} className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Application Form */}
          <div className="card" style={{ padding: 32, position: 'sticky', top: 100 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {(job.jd_json?.requirements?.name !== false) && (
                      <div className="form-group">
                        <label style={labelStyle}>Full Name *</label>
                        <input className="hiris-input" value={form.name} onChange={e => setField('name', e.target.value)} required />
                      </div>
                    )}
                    {(job.jd_json?.requirements?.email !== false) && (
                      <div className="form-group">
                        <label style={labelStyle}>Email *</label>
                        <input className="hiris-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} required />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label style={labelStyle}>Phone Number</label>
                      <input className="hiris-input" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                    </div>
                    {job.jd_json?.requirements?.linkedin && (
                      <div className="form-group">
                        <label style={labelStyle}>LinkedIn URL *</label>
                        <input className="hiris-input" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} />
                      </div>
                    )}
                  </div>

                  {job.jd_json?.requirements?.github && (
                    <div className="form-group">
                      <label style={labelStyle}>GitHub URL *</label>
                      <input className="hiris-input" value={form.github} onChange={e => setField('github', e.target.value)} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {(job.jd_json?.requirements?.resume !== false) && (
                      <div className="form-group">
                        <label style={labelStyle}>Resume (PDF) *</label>
                        <div className="file-input-wrapper" style={resumeFile ? { borderColor: 'var(--teal)', background: 'var(--teal-10)' } : {}}>
                          <input type="file" accept=".pdf" onChange={e => setResumeFile(e.target.files[0])} />
                          <span style={{ display: 'block', fontSize: 12, color: resumeFile ? 'var(--teal)' : 'var(--text-muted)', textAlign: 'center', pointerEvents: 'none' }}>
                            {resumeFile ? `✓ ${resumeFile.name}` : '📄 Click to upload Resume'}
                          </span>
                        </div>
                      </div>
                    )}
                    {job.jd_json?.requirements?.cv && (
                      <div className="form-group">
                        <label style={labelStyle}>CV (PDF) *</label>
                        <div className="file-input-wrapper" style={cvFile ? { borderColor: 'var(--teal)', background: 'var(--teal-10)' } : {}}>
                          <input type="file" accept=".pdf" onChange={e => setCvFile(e.target.files[0])} />
                          <span style={{ display: 'block', fontSize: 12, color: cvFile ? 'var(--teal)' : 'var(--text-muted)', textAlign: 'center', pointerEvents: 'none' }}>
                            {cvFile ? `✓ ${cvFile.name}` : '📄 Click to upload CV'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {questions.map((q, index) => {
                    const answerKey = q.id || index
                    return (
                      <div key={answerKey} className="form-group">
                        <label style={labelStyle}>{q.text}</label>
                        <textarea
                          className="hiris-input"
                          rows={3}
                          value={answers[answerKey] || ''}
                          onChange={e => setAnswers(prev => ({ ...prev, [answerKey]: e.target.value }))}
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                    )
                  })}

                  {/* AI SCREENING CHAT */}
                  <div style={{ 
                    marginTop: 12, 
                    padding: 24, 
                    background: 'var(--bg-input)', 
                    borderRadius: 16, 
                    border: '1px solid var(--border)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--teal)' }}>auto_awesome</span>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>AI Pre-Screening</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                      {chatAnswers.map((ca, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)', fontSize: 13, maxWidth: '85%', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                            {ca.question}
                          </div>
                          <div style={{ alignSelf: 'flex-end', background: 'var(--teal)', color: 'white', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', fontSize: 13, maxWidth: '85%', boxShadow: '0 4px 12px rgba(40,102,110,0.2)' }}>
                            {ca.answer}
                          </div>
                        </div>
                      ))}
                      
                      {chatStep < chatQuestions.length && (
                        <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)', fontSize: 13, maxWidth: '85%', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', animation: 'fadeIn 0.3s ease' }}>
                          {chatQuestions[chatStep]}
                        </div>
                      )}
                    </div>

                    {chatStep < chatQuestions.length ? (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          className="hiris-input"
                          placeholder="Your answer..."
                          value={currentChatInput}
                          onChange={e => setCurrentChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                          style={{ background: 'var(--bg-card)' }}
                        />
                        <button type="button" onClick={handleChatSubmit} className="btn btn-primary" style={{ padding: '0 16px' }}>
                          <span className="material-symbols-outlined">send</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--teal)', textAlign: 'center', fontWeight: 700, padding: 8, background: 'var(--teal-10)', borderRadius: 8 }}>
                        ✓ Screening questions complete
                      </div>
                    )}
                  </div>

                  {error && <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>{error}</div>}

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={submitting || chatStep < chatQuestions.length} 
                    style={{ justifyContent: 'center', padding: '14px', fontSize: 15, width: '100%' }}
                  >
                    {submitting ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
}

