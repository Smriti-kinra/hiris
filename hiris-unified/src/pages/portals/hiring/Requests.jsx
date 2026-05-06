import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import NewRequestModal from '../../../components/NewRequestModal'
import { useToast } from '../../../context/ToastContext'

const STATUS_BADGE = {
  'Pending Review':    'badge-amber',
  'Sent for Approval': 'badge-blue',
  'Approved':          'badge-green',
  'Rejected':          'badge-red',
}

export default function HiringRequests() {
  const navigate = useNavigate()
  const toast = useToast()
  const [requests, setRequests]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [meta, setMeta]             = useState({ total: 0, limit: 10 })
  const [showModal, setShowModal]   = useState(false)

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

  const filtered = requests.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.department?.toLowerCase().includes(search.toLowerCase())
  )

  function handleNewRequest(newReq) {
    setRequests(prev => [newReq, ...prev])
    setMeta(m => ({ ...m, total: m.total + 1 }))
    setShowModal(false)
    toast.success('Hiring request submitted successfully')
  }

  return (
    <AppShell portal="hiring" pageTitle="Hiring Requests">
      <div className="page-header">
        <div>
          <div className="page-title">Hiring Requests</div>
          <div className="page-subtitle">{meta.total || requests.length} requests submitted across your departments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Request
        </button>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            className="hiris-input"
            placeholder="Search by role or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No matching requests</div>
        ) : (
          <>
            <table className="hiris-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Type</th>
                <th>Positions</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => navigate(`/hiring/job-builder?requestId=${r.id}`)} style={{ cursor: 'pointer' }} className="hover:bg-[#F8FAFC]">
                  <td><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.id}</span></td>
                  <td style={{ fontWeight: 600, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.requested_by}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.department}</td>
                  <td>
                    <span className="badge badge-gray">{r.job_type}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--brand)' }}>{r.positions}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {r.deadline ? new Date(r.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span>
                      {r.status === 'Approved' && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '4px 10px', fontSize: 11, minHeight: 'unset' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            apiFetch(`/hiring-requests/${r.id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({ action: 'post' })
                            }).then(() => {
                              toast.success('Job posting is now live!');
                              setRequests(prev => prev.map(req => req.id === r.id ? { ...req, status: 'Posted' } : req));
                            }).catch(err => console.error(err));
                          }}
                        >
                          Post
                        </button>
                      )}
                    </div>
                  </td>
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

      {showModal && (
        <NewRequestModal
          onClose={() => setShowModal(false)}
          onSuccess={handleNewRequest}
        />
      )}
    </AppShell>
  )
}
