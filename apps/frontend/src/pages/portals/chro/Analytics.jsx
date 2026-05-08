import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STAGE_COLORS = { applied: 'var(--accent-gray)', screening: 'var(--accent-amber)', interview: 'var(--accent-blue)', offered: 'var(--accent-green)', accepted: 'var(--accent-green)', rejected: 'var(--accent-red)' }
const STAGE_LABELS = { applied: 'Applied', screening: 'Screening', interview: 'Interview', offered: 'Offer', accepted: 'Hired', rejected: 'Rejected' }
const SOURCE_COLORS = ['var(--accent-blue)', 'var(--accent-green)', 'var(--accent-amber)', 'var(--accent-purple)', 'var(--brand)', 'var(--accent-red)']

function HBar({ label, count, max, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-active)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: color, width: `${Math.round((count / (max||1)) * 100)}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function CHROAnalytics() {
  const [data, setData]     = useState(null)
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/analytics').then(r => r.json()).catch(() => null),
      apiFetch('/dashboard/stats').then(r => r.json()).catch(() => null),
    ]).then(([a, s]) => { setData(a); setStats(s) }).finally(() => setLoading(false))
  }, [])

  const handleExport = () => {
    const rows = []
    rows.push(['Metric', 'Value'])
    rows.push(['Total Requests', ((stats?.pending_requests || 0) + (stats?.approved_requests || 0)).toString()])
    rows.push(['Active Openings', (stats?.active_openings ?? '—').toString()])
    rows.push(['Total Candidates', (stats?.total_candidates ?? '—').toString()])
    rows.push(['Avg AI Score', (data?.avg_ai_score ?? '—').toString()])
    rows.push([])
    rows.push(['Hiring Funnel Stage', 'Count'])
    funnel.forEach(item => rows.push([STAGE_LABELS[item.stage] || item.stage, item.count.toString()]))
    rows.push([])
    rows.push(['Candidates by Source', 'Count'])
    sources.forEach(item => rows.push([item.source, item.count.toString()]))
    rows.push([])
    rows.push(['Jobs by Department', 'Count'])
    depts.forEach(item => rows.push([item.department, item.count.toString()]))

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'hiris-chro-analytics.csv'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  if (loading) return <AppShell portal="chro" pageTitle="Analytics"><div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div></AppShell>

  const funnel  = data?.hiring_funnel        || []
  const sources = data?.candidates_by_source || []
  const depts   = data?.jobs_by_department   || []
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1)
  const maxSource = Math.max(...sources.map(s => s.count), 1)
  const maxDept   = Math.max(...depts.map(d => d.count), 1)

  return (
    <AppShell portal="chro" pageTitle="Analytics">
      <div className="page-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div className="page-title">Hiring Analytics</div><div className="page-subtitle">Live metrics derived from the full hiring pipeline</div></div>
        <button onClick={handleExport} className="btn btn-outline" style={{ fontSize: 13 }}>
          Export Report
        </button>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card"><div className="stat-label">Total Requests</div><div className="stat-value" style={{ color: 'var(--brand)' }}>{(stats?.pending_requests||0) + (stats?.approved_requests||0)}</div></div>
        <div className="stat-card"><div className="stat-label">Active Openings</div><div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{stats?.active_openings ?? '—'}</div></div>
        <div className="stat-card"><div className="stat-label">Total Candidates</div><div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats?.total_candidates ?? '—'}</div></div>
        <div className="stat-card"><div className="stat-label">Avg AI Score</div><div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{data?.avg_ai_score ?? '—'}</div></div>
      </div>
      <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 20 }}>Hiring Funnel</div>
          {funnel.length === 0 ? <div className="empty-state" style={{ padding: '30px 0' }}>No data</div>
          : funnel.map((f, i) => <HBar key={f.stage} label={STAGE_LABELS[f.stage] || f.stage} count={f.count} max={maxFunnel} color={STAGE_COLORS[f.stage] || SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
        </div>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 20 }}>Candidates by Source</div>
          {sources.length === 0 ? <div className="empty-state" style={{ padding: '30px 0' }}>No data</div>
          : sources.map((s, i) => <HBar key={s.source} label={s.source} count={s.count} max={maxSource} color={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
        </div>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 20 }}>Jobs by Department</div>
          {depts.length === 0 ? <div className="empty-state" style={{ padding: '30px 0' }}>No data</div>
          : depts.map((d, i) => <HBar key={d.department} label={d.department} count={d.count} max={maxDept} color={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
        </div>
      </div>
    </AppShell>
  )
}
