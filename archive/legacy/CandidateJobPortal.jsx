import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../../services/api'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  resume_url: '',
  linkedin: '',
  github: '',
}

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export default function CandidateJobPortal() {
  const { token } = useParams()
  const [job, setJob] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const questions = useMemo(() => Array.isArray(job?.questions) ? job.questions : [], [job])

  async function loadJob(track = false) {
    const res = await apiFetch(`/candidate-portal/${token}${track ? '' : '?track=false'}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Job posting not found')
    setJob(data)
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    loadJob(true)
      .catch(err => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false))

    const interval = window.setInterval(() => {
      loadJob(false).catch(() => {})
    }, 15000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [token])

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please enter your name and email.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await apiFetch(`/candidate-portal/${token}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          answers: questions.map((q, index) => ({ question: q.text, answer: answers[q.id || index] || '' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not submit application')
      setSuccess(true)
      setForm(initialForm)
      setAnswers({})
      loadJob(false).catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><div className="spinner" /></div>
  }

  if (error && !job) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-pad">
            <div className="card-title">Job posting unavailable</div>
            <div className="card-sub" style={{ marginTop: 8 }}>{error}</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <section style={{ background: 'var(--bg-sidebar)', color: 'var(--text-inverse)', padding: '34px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ fontSize: 13, color: 'var(--text-on-dark)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
            {job.department} · {job.job_type}
          </div>
          <h1 style={{ fontSize: 38, lineHeight: 1.1, maxWidth: 760, marginBottom: 14 }}>{job.title}</h1>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--text-on-dark)', fontSize: 14 }}>
            <span>{job.location || 'Location not specified'}</span>
            <span>Posted {job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'recently'}</span>
          </div>
        </div>
      </section>

      <div className="candidate-portal-layout" style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 24px 60px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.85fr)', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-pad">
              <h2 className="card-title">Role Summary</h2>
              <div style={{ marginTop: 14, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.summary) || 'Details for this role will be updated soon.' }} />
            </div>
          </div>

          <div className="card">
            <div className="card-pad">
              <h2 className="card-title">Responsibilities</h2>
              <div style={{ marginTop: 14, color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.responsibilities) || 'Responsibilities will be shared by the hiring team.' }} />
            </div>
          </div>

          {job.skills?.length > 0 && (
            <div className="card">
              <div className="card-pad">
                <h2 className="card-title">Skills</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  {job.skills.map(skill => <span key={skill} className="badge badge-gray">{skill}</span>)}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="card" style={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
          <div className="card-pad">
            <div className="card-title">Apply for this role</div>
            {success && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', fontSize: 13, fontWeight: 700 }}>
                Application submitted. The hiring team has your profile.
              </div>
            )}
            {error && job && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="hiris-input" placeholder="Full name *" value={form.name} onChange={e => setField('name', e.target.value)} />
              <input className="hiris-input" type="email" placeholder="Email address *" value={form.email} onChange={e => setField('email', e.target.value)} />
              <input className="hiris-input" placeholder="Phone" value={form.phone} onChange={e => setField('phone', e.target.value)} />
              <input className="hiris-input" placeholder="Resume URL" value={form.resume_url} onChange={e => setField('resume_url', e.target.value)} />
              <input className="hiris-input" placeholder="LinkedIn URL" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} />
              <input className="hiris-input" placeholder="GitHub URL" value={form.github} onChange={e => setField('github', e.target.value)} />

              {questions.map((q, index) => {
                const answerKey = q.id || index
                return (
                  <label key={answerKey} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {q.text}
                    <textarea
                      className="hiris-input"
                      rows={3}
                      value={answers[answerKey] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [answerKey]: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </label>
                )
              })}

              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ justifyContent: 'center', padding: '12px 16px', marginTop: 4 }}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  )
}
