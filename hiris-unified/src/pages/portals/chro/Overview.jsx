import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

export default function CHROOverview() {
  const [pipeline, setPipeline] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/chro/pipeline').then(r => r.json()).catch(() => ({})),
      apiFetch('/hiring-requests').then(r => r.json()).catch(() => []),
    ]).then(([p, req]) => { setPipeline(p); setRequests(Array.isArray(req) ? req : []) }).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Open Positions',      value: pipeline?.total_open_positions ?? '—', color: 'var(--brand)' },
    { label: 'Offers Pending',      value: pipeline?.offers_pending        ?? '—', color: 'var(--accent-amber)' },
    { label: 'Hired This Cycle',    value: pipeline?.hires_this_month      ?? '—', color: 'var(--accent-green)' },
    { label: 'Avg. Days to Hire',   value: pipeline?.avg_time_to_hire_days ?? '—', color: 'var(--accent-blue)' },
  ]

  const statusGroups = ['Pending Review', 'Sent for Approval', 'Approved', 'Rejected']
    .map(s => ({ label: s, count: requests.filter(r => r.status === s).length }))

  return (
    <AppShell portal="chro" pageTitle="Hiring Overview">
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div> : (
        <>
          <div className="page-header">
            <div><div className="page-title">Hiring Overview</div><div className="page-subtitle">Organisation-wide pipeline at a glance</div></div>
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {statCards.map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 20 }}>Pipeline Status Breakdown</div>
              {statusGroups.map((g, i) => {
                const colors = ['var(--accent-amber)', 'var(--accent-blue)', 'var(--accent-green)', 'var(--accent-red)']
                return (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i] }} />
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{g.label}</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: colors[i] }}>{g.count}</span>
                  </div>
                )
              })}
            </div>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 20 }}>Recent Requests</div>
              {requests.slice(0, 5).map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.department} · {r.requested_by}</div>
                  </div>
                  <span className={`badge ${{ 'Pending Review': 'badge-amber', 'Sent for Approval': 'badge-blue', 'Approved': 'badge-green', 'Rejected': 'badge-red' }[r.status] || 'badge-gray'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
