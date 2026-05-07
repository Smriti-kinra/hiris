import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const DEPT_COLORS = ['var(--accent-blue)', 'var(--accent-green)', 'var(--accent-amber)', 'var(--accent-purple)', 'var(--brand)', 'var(--accent-red)']

export default function CHRODashboard() {
  const { user } = useAuth()
  const [stats, setStats]       = useState(null)
  const [openings, setOpenings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/dashboard/stats').then(r => r.json()).catch(() => ({})),
      apiFetch('/active-openings').then(r => r.json()).catch(() => []),
    ]).then(([s, op]) => {
      setStats(s)
      setOpenings(Array.isArray(op) ? op : [])
    }).finally(() => setLoading(false))
  }, [])

  /* department breakdown from active openings */
  const deptMap = {}
  openings.forEach(o => {
    if (o.department) deptMap[o.department] = (deptMap[o.department] || 0) + 1
  })
  const depts  = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxVal = Math.max(...depts.map(d => d[1]), 1)

  const statCards = [
    { label: 'Active Openings',  value: openings.filter(o => o.is_open).length,   color: 'var(--brand)' },
    { label: 'Total Candidates', value: stats?.total_candidates ?? '—',            color: 'var(--accent-blue)' },
    { label: 'Pending Approval', value: stats?.pending_requests ?? '—',            color: 'var(--accent-amber)' },
    { label: 'Approved Roles',   value: stats?.approved_requests ?? '—',           color: 'var(--accent-green)' },
  ]

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
              <div className="page-title">Welcome, {user?.name}</div>
              <div className="page-subtitle">Organisation-wide hiring overview and analytics.</div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {statCards.map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 28, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Dept bar chart */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 20 }}>Openings by Department</div>
              {depts.length === 0 ? (
                <div className="empty-state">No active openings</div>
              ) : (
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
              )}
            </div>

            {/* Active Openings detail */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 20 }}>Active Openings</div>
              {openings.length === 0 ? (
                <div className="empty-state">No active openings</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {openings.slice(0, 6).map(o => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{o.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{o.department}</div>
                      </div>
                      <span style={{
                        background: 'var(--brand-light)', color: 'var(--brand)',
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>
                        {o.candidates} candidate{o.candidates !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </AppShell>
  )
}
