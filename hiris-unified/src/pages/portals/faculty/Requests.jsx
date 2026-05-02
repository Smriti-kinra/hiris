import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import NewRequestModal from '../../../components/NewRequestModal'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = { 'Pending Review': 'badge-amber', 'Sent for Approval': 'badge-blue', 'Approved': 'badge-green', 'Rejected': 'badge-red' }

export default function FacultyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [page, setPage]         = useState(1)
  const [meta, setMeta]         = useState({ total: 0, limit: 10 })

  useEffect(() => {
    setLoading(true)
    apiFetch(`/hiring-requests?page=${page}&limit=10`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setRequests(d.data)
          setMeta(d.meta)
        } else {
          setRequests(Array.isArray(d) ? d : [])
        }
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }, [page])

  function handleSuccess(newReq) { setRequests(prev => [newReq, ...prev]); setModal(false) }

  return (
    <AppShell portal="faculty" pageTitle="My Requests">
      {modal && <NewRequestModal onClose={() => setModal(false)} onSuccess={handleSuccess} />}
      <div className="page-header">
        <div>
          <div className="page-title">Hiring Requests</div>
          <div className="page-subtitle">{meta.total || requests.length} requests submitted across departments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Request
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : requests.length === 0 ? (
          <div className="empty-state">No requests submitted yet</div>
        ) : (
          <>
            <table className="hiris-table">
            <thead><tr><th>ID</th><th>Role</th><th>Department</th><th>Type</th><th>Positions</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.id}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.title}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.requested_by}</div></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.department}</td>
                  <td><span className="badge badge-gray">{r.job_type}</span></td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--brand)' }}>{r.positions}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.deadline ? new Date(r.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
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
