import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import NewRequestModal from '../../../components/NewRequestModal'
import { useAuth } from '../../../context/AuthContext'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = {
  'Pending Review':    'badge-amber',
  'Sent for Approval': 'badge-blue',
  'Approved':          'badge-green',
}

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [requests, setRequests]       = useState([])
  const [openings, setOpenings]       = useState([])
  const [facultyStats, setFacultyStats] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/hiring-requests').then(r => r.json()).catch(() => []),
      apiFetch('/active-openings').then(r => r.json()).catch(() => []),
      apiFetch('/faculty/stats').then(r => r.json()).catch(() => null),
    ]).then(([req, op, fs]) => {
      setRequests(Array.isArray(req) ? req.slice(0, 4) : [])
      setOpenings(Array.isArray(op) ? op.slice(0, 4) : [])
      setFacultyStats(fs)
    }).finally(() => setLoading(false))
  }, [])

  function handleNewRequest(req) {
    setRequests(prev => [req, ...prev].slice(0, 4))
    setModal(false)
  }

  return (
    <AppShell portal="faculty" pageTitle="Faculty Portal">
      {modal && <NewRequestModal onClose={() => setModal(false)} onSuccess={handleNewRequest} />}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <div className="page-title">Welcome, {user?.name?.split(' ')[0]}!</div>
              <div className="page-subtitle">Review your hiring requests, JDs, and candidate profiles below.</div>
            </div>
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Request
            </button>
          </div>

          {/* Quick stats */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-label">My Requests</div>
              <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{requests.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">JDs Pending Review</div>
              <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{facultyStats?.jds_pending ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Interviews Scheduled</div>
              <div className="stat-value" style={{ color: 'var(--brand)' }}>{facultyStats?.interviews_scheduled ?? '—'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* My Requests */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="card-title">My Hiring Requests</div>
                <div className="card-sub">Requests you have submitted</div>
              </div>
              {requests.length === 0 ? (
                <div className="empty-state">No requests yet</div>
              ) : (
                <table className="hiris-table">
                  <thead><tr><th>Role</th><th>Status</th></tr></thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {r.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.job_type} · {r.positions} pos.</div>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Active openings */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="card-title">Open Positions</div>
                <div className="card-sub">Currently recruiting</div>
              </div>
              {openings.length === 0 ? (
                <div className="empty-state">No open positions</div>
              ) : (
                <table className="hiris-table">
                  <thead><tr><th>Role</th><th>Candidates</th><th>Deadline</th></tr></thead>
                  <tbody>
                    {openings.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.title}
                        </td>
                        <td>
                          <span style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            {o.candidates}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
