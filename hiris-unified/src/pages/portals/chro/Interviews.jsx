import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-amber' }

export default function CHROInterviews() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')

  useEffect(() => {
    apiFetch('/interviews').then(r => r.json()).then(d => setInterviews(Array.isArray(d) ? d : [])).catch(() => setInterviews([])).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? interviews : interviews.filter(i => i.status === filter)

  return (
    <AppShell portal="chro" pageTitle="Final Interviews">
      <div className="page-header">
        <div><div className="page-title">Final Interviews</div><div className="page-subtitle">{interviews.length} total · {interviews.filter(i => i.status === 'scheduled').length} upcoming</div></div>
      </div>
      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          {['all', 'scheduled', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? 'var(--brand)' : 'var(--bg-hover)', color: filter === f ? '#fff' : 'var(--text-secondary)', borderColor: filter === f ? 'var(--brand)' : 'var(--border)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : filtered.length === 0 ? <div className="empty-state">No interviews in this category</div>
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
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.notes || '—'}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}
