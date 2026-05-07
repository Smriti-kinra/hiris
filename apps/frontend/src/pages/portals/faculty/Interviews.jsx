import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'

const STATUS_BADGE = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-amber' }

export default function FacultyInterviews() {
  const navigate = useNavigate()
  const toast = useToast()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [starting, setStarting]     = useState(null)

  const loadInterviews = useCallback(() => {
    console.log('[FACULTY] Loading faculty interview schedule...')
    setLoading(true)
    apiFetch('/interviews?active=true')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : []
        console.log(`[FACULTY] Loaded ${list.length} interviews`)
        setInterviews(list)
      })
      .catch(err => {
        console.error('[FACULTY] Failed to load interviews:', err)
        setInterviews([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadInterviews()
  }, [loadInterviews])

  const handleStartInterview = async (i) => {
    setStarting(i.id)
    // Faculty always conduct technical interviews
    const type = 'technical'
    try {
      const res = await apiFetch('/interviews/start', {
        method: 'POST',
        body: JSON.stringify({ application_id: i.application_id, type })
      })
      if (res.ok) {
        const { id } = await res.json()
        console.log(`[FACULTY] Interview session created: ${id}, navigating to technical room`)
        navigate(`/interview-room/technical/${id}`)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to start interview.')
      }
    } catch (err) {
      toast.error('Could not start interview. Please try again.')
    } finally {
      setStarting(null)
    }
  }

  const scheduled = interviews.filter(i => i.status === 'scheduled')
  const completed  = interviews.filter(i => i.status === 'completed')

  return (
    <AppShell portal="faculty" pageTitle="Interviews">
      <div className="page-header">
        <div>
          <div className="page-title">Interviews</div>
          <div className="page-subtitle">
            {scheduled.length} scheduled · {completed.length} completed
          </div>
        </div>
        <button className="btn btn-outline" onClick={loadInterviews} style={{ fontSize: 13 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : interviews.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 8 }}>No interviews scheduled</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Candidates will appear here when they are moved to the Technical Interview stage.
            </div>
          </div>
        ) : (
          <table className="hiris-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Round</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600 }}>{i.candidate_name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.job_title}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{i.round || 'Technical Interview'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[i.status] || 'badge-gray'}`}>{i.status}</span></td>
                  <td>
                    {i.status === 'scheduled' ? (
                      <button
                        onClick={() => handleStartInterview(i)}
                        disabled={starting === i.id}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        {starting === i.id ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                            Starting...
                          </span>
                        ) : 'Start Interview'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.notes || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}
