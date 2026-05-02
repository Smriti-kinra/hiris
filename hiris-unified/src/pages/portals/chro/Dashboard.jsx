import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import ApproveRejectModal from '../../../components/ApproveRejectModal'
import { useToast } from '../../../context/ToastContext'

const DEPT_COLORS = ['var(--accent-blue)', 'var(--accent-green)', 'var(--accent-amber)', 'var(--accent-purple)', 'var(--brand)', 'var(--accent-red)']

export default function CHRODashboard() {
  const toast = useToast()
  const [stats, setStats]       = useState(null)
  const [requests, setRequests] = useState([])
  const [openings, setOpenings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // { request, action } | null

  function loadAll() {
    return Promise.all([
      apiFetch('/dashboard/stats').then(r => r.json()).catch(() => ({})),
      apiFetch('/hiring-requests').then(r => r.json()).catch(() => []),
      apiFetch('/active-openings').then(r => r.json()).catch(() => []),
    ]).then(([s, req, op]) => {
      setStats(s)
      setRequests(Array.isArray(req) ? req : [])
      setOpenings(Array.isArray(op) ? op : [])
    })
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false))
  }, [])

  /* department breakdown */
  const deptMap = {}
  requests.forEach(r => {
    if (r.department) deptMap[r.department] = (deptMap[r.department] || 0) + 1
  })
  const depts = Object.entries(deptMap).sort((a,b) => b[1]-a[1]).slice(0, 6)
  const maxVal = Math.max(...depts.map(d => d[1]), 1)

  const statCards = [
    { label: 'Total Requests',   value: requests.length },
    { label: 'Pending Review',   value: requests.filter(r => r.status === 'Pending Review').length },
    { label: 'Approved',         value: requests.filter(r => r.status === 'Approved').length },
    { label: 'Active Openings',  value: openings.filter(o => o.is_open).length },
    { label: 'Total Candidates', value: stats?.total_candidates ?? '—' },
  ]

  function handleStatusUpdate(updated) {
    // Optimistic local update so counts refresh instantly
    setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
    setModal(null)
    const verb = updated.status === 'Approved' ? 'approved' : 'rejected'
    toast.success(`Request ${verb} successfully`)
    // Re-fetch stats from server to sync the stat cards
    apiFetch('/dashboard/stats').then(r => r.json()).then(setStats).catch(() => {})
  }

  function exportCSV() {
    const headers = ['ID', 'Title', 'Department', 'Job Type', 'Positions', 'Status', 'Requested By', 'Deadline']
    const rows = requests.map(r => [
      r.id, r.title, r.department, r.job_type, r.positions, r.status, r.requested_by,
      r.deadline ? new Date(r.deadline).toLocaleDateString('en-IN') : ''
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `hiris-report-${new Date().toISOString().slice(0,10)}.csv` })
    a.click(); URL.revokeObjectURL(url)
    toast.info('Report exported')
  }

  return (
    <AppShell portal="chro" pageTitle="CHRO Overview">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <div className="page-title">Hiring Intelligence</div>
              <div className="page-subtitle">Organisation-wide hiring overview and analytics.</div>
            </div>
            <button className="btn btn-outline" onClick={exportCSV}>Export Report</button>
          </div>

          {/* Stats row — stat-grid-5 collapses gracefully via CSS breakpoints */}
          <div className="stat-grid stat-grid-5">
            {statCards.map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 28, color: 'var(--brand)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Dept bar chart */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 20 }}>Requests by Department</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {depts.map(([dept, count], i) => (
                  <div key={dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{dept}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: DEPT_COLORS[i % DEPT_COLORS.length] }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-active)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: DEPT_COLORS[i % DEPT_COLORS.length],
                        width: `${(count / maxVal) * 100}%`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline status breakdown */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 20 }}>Pipeline Status</div>
              {[
                { label: 'Pending Review',    count: requests.filter(r => r.status === 'Pending Review').length,    color: 'var(--accent-amber)' },
                { label: 'Sent for Approval', count: requests.filter(r => r.status === 'Sent for Approval').length, color: 'var(--accent-blue)' },
                { label: 'Approved',          count: requests.filter(r => r.status === 'Approved').length,          color: 'var(--accent-green)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.count}</span>
                </div>
              ))}
            </div>

            {/* Full requests table */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="card-title">All Hiring Requests</div>
                <div className="card-sub">Complete view across all departments and requestors</div>
              </div>
              <table className="hiris-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Role</th><th>Department</th><th>Type</th><th>Requested By</th><th>Deadline</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>{r.id}</span></td>
                      <td style={{ fontWeight: 600, maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.department}</td>
                      <td><span className="badge badge-gray">{r.job_type}</span></td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{r.requested_by}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.deadline ? new Date(r.deadline).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' }) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${
                          r.status === 'Approved' ? 'badge-green' :
                          r.status === 'Sent for Approval' ? 'badge-blue' :
                          r.status === 'Pending Review' ? 'badge-amber' :
                          r.status === 'Rejected' ? 'badge-red' : 'badge-gray'
                        }`}>{r.status}</span>
                      </td>
                      <td>
                        {(r.status === 'Pending Review' || r.status === 'Sent for Approval') ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn"
                              style={{ padding: '4px 10px', fontSize: 12, background: 'var(--accent-green)', color: '#fff', minHeight: 'unset', borderRadius: 6 }}
                              onClick={() => setModal({ request: r, action: 'approve' })}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: 12, color: 'var(--accent-red)', borderColor: 'var(--accent-red)', minHeight: 'unset', borderRadius: 6 }}
                              onClick={() => setModal({ request: r, action: 'reject' })}
                            >
                              Reject
                            </button>
                          </div>
                        ) : r.status === 'Approved' ? (
                          <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>✓ Approved</span>
                        ) : r.status === 'Rejected' ? (
                          <span style={{ fontSize: 12, color: 'var(--accent-red)', fontWeight: 600 }}>✕ Rejected</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

      {modal && (
        <ApproveRejectModal
          request={modal.request}
          action={modal.action}
          onClose={() => setModal(null)}
          onSuccess={handleStatusUpdate}
        />
      )}
    </AppShell>
  )
}
