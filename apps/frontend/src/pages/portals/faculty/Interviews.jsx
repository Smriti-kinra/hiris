import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-amber' }

export default function FacultyInterviews() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    apiFetch('/interviews?active=true').then(r => r.json()).then(d => setInterviews(Array.isArray(d) ? d : [])).catch(() => setInterviews([])).finally(() => setLoading(false))
  }, [])

  const handleStartInterview = async (i) => {
    const isTechnical = i.stage === 'technical_interview' || i.round?.toLowerCase().includes('technical')
    const type = isTechnical ? 'technical' : 'behavioral'
    const res = await apiFetch('/interviews/start', {
      method: 'POST',
      body: JSON.stringify({ application_id: i.application_id, type })
    })
    if (res.ok) {
      const { id } = await res.json()
      navigate(`/interview-room/${type}/${id}`)
    }
  }

  return (
    <AppShell portal="faculty" pageTitle="Interviews">
      <div className="page-header">
        <div><div className="page-title">Interviews</div><div className="page-subtitle">{interviews.filter(i => i.status === 'scheduled').length} scheduled · {interviews.filter(i => i.status === 'completed').length} completed</div></div>
      </div>
      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : interviews.length === 0 ? <div className="empty-state">No interviews scheduled</div>
        : (
          <table className="hiris-table">
            <thead><tr><th>Candidate</th><th>Role</th><th>Round</th><th>Scheduled</th><th>Interviewer</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {interviews.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600 }}>{i.candidate_name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.job_title}</div></td>
                  <td style={{ fontSize: 13 }}>{i.round}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{i.interviewer_name || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[i.status] || 'badge-gray'}`}>{i.status}</span></td>
                  <td>
                    {i.status === 'scheduled' ? (
                      <button onClick={() => handleStartInterview(i)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                        Start Interview
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
