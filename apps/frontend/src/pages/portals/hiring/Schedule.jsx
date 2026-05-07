import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', pending: 'badge-amber' }

export default function HiringSchedule() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [meta, setMeta]             = useState({ total: 0, limit: 10 })

  useEffect(() => {
    setLoading(true)
    apiFetch(`/interviews?page=${page}&limit=10`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setInterviews(d.data)
          setMeta(d.meta)
        } else {
          setInterviews(Array.isArray(d) ? d : [])
        }
      })
      .catch(() => setInterviews([]))
      .finally(() => setLoading(false))
  }, [page])

  const upcoming  = interviews.filter(i => i.status === 'scheduled')
  const completed = interviews.filter(i => i.status === 'completed')

  return (
    <AppShell portal="hiring" pageTitle="Schedule">
      <div className="page-header">
        <div>
          <div className="page-title">Interview Schedule</div>
          <div className="page-subtitle">{meta.total || interviews.length} total scheduled or completed interviews</div>
        </div>
      </div>
      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="card-title">All Interviews</div>
          <div className="card-sub">Scheduled and past interview sessions</div>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : interviews.length === 0 ? (
          <div className="empty-state">No interviews scheduled</div>
        ) : (
          <>
            <table className="hiris-table">
            <thead><tr><th>Candidate</th><th>Role</th><th>Round</th><th>Interviewer</th><th>Scheduled</th><th>Status</th></tr></thead>
            <tbody>
              {interviews.map(i => (
                <tr key={i.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.candidate_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{i.candidate_email}</div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.job_title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.department}</div>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{i.round}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{i.interviewer_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[i.status] || 'badge-gray'}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
            </table>
            {meta.total > meta.limit && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing {((page - 1) * meta.limit) + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} results
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} disabled={page * meta.limit >= meta.total} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
