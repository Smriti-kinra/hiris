import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import NewRequestModal from '../../../components/NewRequestModal'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

function statusBadge(status) {
  const map = {
    'Pending Review':   'badge-amber',
    'Sent for Approval':'badge-blue',
    'Approved':         'badge-green',
    'Rejected':         'badge-red',
    'Posted':           'badge-green',
  }
  return `badge ${map[status] || 'badge-gray'}`
}

function pipelineBadge(stage) {
  const map = {
    Applied:   'badge-gray',
    Screening: 'badge-amber',
    Interview: 'badge-blue',
    Offer:     'badge-green',
    'HR Round':'badge-purple',
  }
  return `badge ${map[stage] || 'badge-gray'}`
}

export default function HiringDashboard() {
  const { user } = useAuth()
  const canRequestJobs = !!(user?.permissions?.can_request_jobs || user?.permissions?.is_admin)
  const [stats, setStats]       = useState(null)
  const [requests, setRequests] = useState([])
  const [openings, setOpenings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/dashboard/stats').then(r => r.json()).catch(() => ({})),
      apiFetch('/hiring-requests').then(r => r.json()).catch(() => []),
      apiFetch('/active-openings').then(r => r.json()).catch(() => []),
    ]).then(([s, req, op]) => {
      setStats(s)
      setRequests(Array.isArray(req) ? req.slice(0, 5) : [])
      setOpenings(Array.isArray(op) ? op.slice(0, 5) : [])
    }).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Pending Requests', value: stats?.pending_requests ?? '—', trend: null },
    { label: 'Approved',         value: stats?.approved_requests ?? '—', trend: 'up' },
    { label: 'Active Openings',  value: stats?.active_openings ?? '—',   trend: null },
    { label: 'Total Candidates', value: stats?.total_candidates ?? '—',  trend: 'up' },
  ]

  function handleNewRequest(req) {
    setRequests(prev => [req, ...prev].slice(0, 5))
    setModal(false)
  }

  return (
    <AppShell portal="hiring" pageTitle="Hiring Manager Dashboard">
      {modal && <NewRequestModal onClose={() => setModal(false)} onSuccess={handleNewRequest} />}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <div className="page-title">Welcome, {user?.name}</div>
              <div className="page-subtitle">Here's what's happening with your hiring pipeline today.</div>
            </div>
            {canRequestJobs && (
              <button className="btn btn-primary" onClick={() => setModal(true)}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Request
              </button>
            )}
          </div>

          {/* Stat cards */}
          <div className="stat-grid">
            {statCards.map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: 'var(--brand)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Two-col layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Recent Requests */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="card-title">Recent Requests</div>
                  <div className="card-sub">Latest hiring requests submitted</div>
                </div>
              </div>
              {requests.length === 0 ? (
                <div className="empty-state">No requests found</div>
              ) : (
                <table className="hiris-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, maxWidth: 160 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.department}</span>
                        </td>
                        <td><span className={statusBadge(r.status)}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Active Openings */}
            <div className="card">
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="card-title">Active Openings</div>
                <div className="card-sub">Live job postings & pipeline stage</div>
              </div>
              {openings.length === 0 ? (
                <div className="empty-state">No active openings</div>
              ) : (
                <table className="hiris-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Candidates</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openings.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, maxWidth: 150 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.title}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: 'var(--brand-light)', color: 'var(--brand)',
                            padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700
                          }}>{o.candidates}</span>
                        </td>
                        <td><span className={pipelineBadge(o.status)}>{o.status}</span></td>
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
