import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-amber' }

export default function CHROInterviews() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')

  useEffect(() => {
    apiFetch('/interviews?active=true').then(r => r.json()).then(d => setInterviews(Array.isArray(d) ? d : [])).catch(() => setInterviews([])).finally(() => setLoading(false))
  }, [])

  const handleStartInterview = async (i) => {
    // CHRO always conducts behavioral interviews
    const type = 'behavioral'
    const res = await apiFetch('/interviews/start', {
      method: 'POST',
      body: JSON.stringify({ application_id: i.application_id, type })
    })
    if (res.ok) {
      const { id } = await res.json()
      navigate(`/interview-room/${type}/${id}`)
    }
  }

  const filtered = interviews.filter(i => i.status === 'scheduled')

  return (
    <AppShell portal="chro" pageTitle="Final Interviews">
      <div className="page-header">
        <div><div className="page-title">Final Interviews</div><div className="page-subtitle">{filtered.length} upcoming interviews</div></div>
      </div>
      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : filtered.length === 0 ? <div className="empty-state">No scheduled interviews</div>
        : (
          <table className="hiris-table">
            <thead><tr><th>Candidate</th><th>Role</th><th>Round</th><th>Interviewer</th><th>Scheduled</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.candidate_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{i.candidate_email}</div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.job_title}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.department}</div></td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{i.round}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{i.interviewer_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
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
