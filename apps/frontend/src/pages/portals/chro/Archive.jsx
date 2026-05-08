import { useState, useEffect, useCallback } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import { useNavigate } from 'react-router-dom'

const TABS = ['Employees', 'Expired Openings']

const STATUS_COLORS = {
  active: '#10B981', resigned: '#F59E0B', terminated: '#EF4444',
  offered: '#3B82F6', rejected: '#EF4444', applied: '#6B7280',
  under_review: '#F59E0B', technical_interview: '#8B5CF6',
  behavioral_interview: '#6366F1', final_review: '#10B981',
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: color || 'var(--text-primary)' }}>{value ?? '—'}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: (color || 'var(--brand)') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      </div>
    </div>
  )
}

function Badge({ label, color }) {
  const bg = { '#10B981': '#ECFDF5', '#EF4444': '#FEF2F2', '#F59E0B': '#FFFBEB', '#3B82F6': '#EFF6FF', '#8B5CF6': '#F5F3FF', '#6B7280': '#F9FAFB', '#6366F1': '#EEF2FF' }
  const c = color || '#6B7280'
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg[c] || '#F9FAFB', color: c, border: `1px solid ${c}30` }}>{label}</span>
}

export default function Archive() {
  const [tab, setTab] = useState(0)
  const [overview, setOverview] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [employees, setEmployees] = useState([])
  const [expiredJobs, setExpiredJobs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobCandidates, setJobCandidates] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/archive/overview').then(r => r.ok ? r.json() : null).then(d => d && setOverview(d)).catch(() => {})
  }, [])

  const loadCandidates = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.stage) params.set('stage', filters.stage)
    if (filters.department) params.set('department', filters.department)
    apiFetch(`/archive/candidates?${params}`).then(r => r.ok ? r.json() : []).then(d => { setCandidates(d); setLoading(false) }).catch(() => setLoading(false))
  }, [search, filters])

  const loadEmployees = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.status) params.set('status', filters.status)
    if (filters.department) params.set('department', filters.department)
    apiFetch(`/archive/employees?${params}`).then(r => r.ok ? r.json() : []).then(d => { setEmployees(d); setLoading(false) }).catch(() => setLoading(false))
  }, [search, filters])

  const loadExpiredJobs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.department) params.set('department', filters.department)
    apiFetch(`/archive/expired-jobs?${params}`).then(r => r.ok ? r.json() : []).then(d => { setExpiredJobs(d); setLoading(false) }).catch(() => setLoading(false))
  }, [search, filters])

  const loadAnalytics = useCallback(() => {
    apiFetch('/archive/analytics').then(r => r.ok ? r.json() : null).then(d => d && setAnalytics(d)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 0) { loadEmployees(); loadAnalytics() }
    if (tab === 1) loadExpiredJobs()
  }, [tab])

  useEffect(() => {
    if (tab === 0) loadEmployees()
    if (tab === 1) loadExpiredJobs()
  }, [search, filters])

  const loadJobCandidates = async (job) => {
    setSelectedJob(job)
    const r = await apiFetch(`/archive/expired-jobs/${job.id}/candidates`)
    const d = await r.json()
    setJobCandidates(d)
  }

  return (
    <AppShell portal="chro" pageTitle="Archive">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">Archive</div>
          <div className="page-subtitle">Workforce intelligence, hiring history & employee lifecycle records</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-input)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === i ? 'var(--bg-card)' : 'transparent',
            color: tab === i ? 'var(--brand)' : 'var(--text-muted)',
            boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
          }}>{t}</button>
        ))}
      </div>

      {/* ── Tab 0: Employees ── */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {analytics && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatCard label="Retention Rate" value={analytics.retention?.retention_rate_pct != null ? `${analytics.retention.retention_rate_pct}%` : '—'} icon="📈" color="#10B981" />
              <StatCard label="Total Ever Hired" value={analytics.retention?.total_ever_hired} icon="🎯" color="#3B82F6" />
              <StatCard label="Currently Active" value={analytics.retention?.currently_active} icon="✅" color="#6366F1" />
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input className="hiris-input" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
            <select className="hiris-input" style={{ maxWidth: 180 }} value={filters.status || ''} onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined }))}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
              <option value="retired">Retired</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div> : (
              <table className="hiris-table">
                <thead><tr>
                  <th>Employee</th><th>Role</th><th>Department</th>
                  <th>Hire Date</th><th>Tenure</th><th>Status</th><th>Risk</th>
                </tr></thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No employees found. Hire a candidate to see them here.</td></tr>
                  ) : employees.map(e => (
                    <tr key={e.id} style={{ cursor: e.candidate_id ? 'pointer' : 'default' }} onClick={() => e.candidate_id && navigate(`/chro/candidates/${e.candidate_id}`)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.email}</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.role || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.department || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.hire_date ? new Date(e.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.tenure_days != null ? `${Math.floor(e.tenure_days / 30)}m` : '—'}</td>
                      <td><Badge label={e.status} color={STATUS_COLORS[e.status] || '#6B7280'} /></td>
                      <td>
                        <Badge label={e.attrition_risk || 'low'} color={e.attrition_risk === 'high' || e.attrition_risk === 'critical' ? '#EF4444' : e.attrition_risk === 'medium' ? '#F59E0B' : '#10B981'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {analytics?.department_stability?.length > 0 && (
            <div className="card card-pad">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Department Stability</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analytics.department_stability.map(d => {
                  const total = (d.active + d.exited) || 1
                  const pct = Math.round((d.active / total) * 100)
                  return (
                    <div key={d.department}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{d.department}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{d.active} active · {d.exited} exited · avg {Math.floor((d.avg_tenure_days || 0) / 30)}m tenure</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: 6, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 1: Expired Openings ── */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedJob ? (
            <div>
              <button onClick={() => { setSelectedJob(null); setJobCandidates([]) }} className="btn btn-outline" style={{ marginBottom: 16, fontSize: 13, padding: '6px 14px' }}>← Back to Expired Openings</button>
              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedJob.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedJob.department} · Closed {selectedJob.closed_at ? new Date(selectedJob.closed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 13 }}>
                  <span>📥 {selectedJob.total_applicants} applied</span>
                  <span style={{ color: '#10B981' }}>✅ {selectedJob.total_hired} hired</span>
                  <span style={{ color: '#EF4444' }}>❌ {selectedJob.total_rejected} rejected</span>
                </div>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Applicants</div>
                <table className="hiris-table">
                  <thead><tr><th>Candidate</th><th>Applied</th><th>Status</th><th>AI Score</th></tr></thead>
                  <tbody>
                    {jobCandidates.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No applicants found</td></tr>
                    ) : jobCandidates.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{c.applied_at ? new Date(c.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                        <td><Badge label={c.stage} color={STATUS_COLORS[c.stage_raw] || '#6B7280'} /></td>
                        <td style={{ fontWeight: 700, color: c.score >= 75 ? '#10B981' : c.score >= 50 ? '#F59E0B' : '#EF4444' }}>{c.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="hiris-input" placeholder="Search expired openings…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div> : (
                  <table className="hiris-table">
                    <thead><tr>
                      <th>Job Title</th><th>Department</th><th>Type</th>
                      <th>Posted</th><th>Closed</th><th>Applicants</th><th>Hired</th>
                    </tr></thead>
                    <tbody>
                      {expiredJobs.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No expired job openings yet. Jobs past their deadline are automatically archived here.</td></tr>
                      ) : expiredJobs.map(j => (
                        <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => loadJobCandidates(j)}>
                          <td style={{ fontWeight: 600 }}>{j.title}</td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{j.department || '—'}</td>
                          <td><span className="badge badge-gray">{j.job_type}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.posted_at ? new Date(j.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.closed_at ? new Date(j.closed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{j.total_applicants}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#10B981' }}>{j.total_hired}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  )
}
