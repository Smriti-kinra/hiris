import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch, safeJson } from '../../services/api'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const CHAT_QUESTIONS = [
  "Why do you want to apply to Plaksha?",
  "How would you contribute to the Plaksha community?",
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
    const newAnswers = [...chatAnswers, { question: CHAT_QUESTIONS[chatStep], answer: currentChatInput }]
    setChatAnswers(newAnswers)
    setCurrentChatInput('')
    setChatStep(prev => prev + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !resumeFile || !cvFile) {
      setError('Please fill in required fields and upload both Resume and CV.')
      return
    }
    if (chatStep < CHAT_QUESTIONS.length) {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/jobs/public/${token}/apply`, {
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
      <div style={{ minHeight: '100vh', background: 'var(--slate-50)' }}>
        <Navbar />
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
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)', fontFamily: 'var(--font-body)' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'start' }}>
          
          {/* Job Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>description</span>
                Role Overview
              </h2>
              <div 
                style={{ color: 'var(--slate-600)', fontSize: 15, lineHeight: 1.8 }} 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.summary) || 'No summary provided.' }} 
              />
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>assignment</span>
                Key Responsibilities
              </h2>
              <div 
                className="job-html-content"
                style={{ color: 'var(--slate-600)', fontSize: 15, lineHeight: 1.8 }} 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.responsibilities) || 'Shared during the interview process.' }} 
              />
            </div>

            {job.skills?.length > 0 && (
              <div className="card" style={{ padding: 32 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--teal)' }}>verified</span>
                  Requirements
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {job.skills.map(skill => (
                    <span key={skill} className="badge" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--border)' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Application Form */}
          <div className="card" style={{ padding: 32, position: 'sticky', top: 100 }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-10)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32 }}>check_circle</span>
                </div>
                <h2 style={{ fontSize: 24, marginBottom: 12 }}>Application Submitted!</h2>
                <p style={{ color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: 32 }}>
                  Thank you for applying. Our hiring team will review your profile and get back to you via email.
                </p>
                <button onClick={() => window.location.reload()} className="btn btn-primary">Submit Another Application</button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label style={labelStyle}>Full Name *</label>
                      <input className="hiris-input" value={form.name} onChange={e => setField('name', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label style={labelStyle}>Email *</label>
                      <input className="hiris-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={labelStyle}>Phone Number</label>
                    <input className="hiris-input" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label style={labelStyle}>Resume (PDF) *</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept=".pdf" onChange={e => setResumeFile(e.target.files[0])} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label style={labelStyle}>CV (PDF) *</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept=".pdf" onChange={e => setCvFile(e.target.files[0])} required />
                      </div>
                    </div>
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
                    background: 'var(--slate-50)', 
                    borderRadius: 16, 
                    border: '1px solid var(--border)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--teal)' }}>auto_awesome</span>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--slate-500)' }}>AI Pre-Screening</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                      {chatAnswers.map((ca, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ alignSelf: 'flex-start', background: 'white', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)', fontSize: 13, maxWidth: '85%', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                            {ca.question}
                          </div>
                          <div style={{ alignSelf: 'flex-end', background: 'var(--teal)', color: 'white', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', fontSize: 13, maxWidth: '85%', boxShadow: '0 4px 12px rgba(40,102,110,0.2)' }}>
                            {ca.answer}
                          </div>
                        </div>
                      ))}
                      
                      {chatStep < CHAT_QUESTIONS.length && (
                        <div style={{ alignSelf: 'flex-start', background: 'white', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)', fontSize: 13, maxWidth: '85%', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', animation: 'fadeIn 0.3s ease' }}>
                          {CHAT_QUESTIONS[chatStep]}
                        </div>
                      )}
                    </div>

                    {chatStep < CHAT_QUESTIONS.length ? (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          className="hiris-input"
                          placeholder="Your answer..."
                          value={currentChatInput}
                          onChange={e => setCurrentChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                          style={{ background: 'white' }}
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
                    disabled={submitting || chatStep < CHAT_QUESTIONS.length} 
                    style={{ justifyContent: 'center', padding: '14px', fontSize: 15, width: '100%' }}
                  >
                    {submitting ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--slate-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
}

