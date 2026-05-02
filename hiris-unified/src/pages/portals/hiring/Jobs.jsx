import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STATUS_BADGE = { active: 'badge-green', pending: 'badge-amber', closed: 'badge-red', draft: 'badge-gray' }
const URGENCY_BADGE = { urgent: 'badge-red', high: 'badge-amber', medium: 'badge-blue', low: 'badge-gray' }

export default function HiringJobs() {
  const [jobs, setJobs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [meta, setMeta]     = useState({ total: 0, limit: 10 })

  useEffect(() => {
    setLoading(true)
    apiFetch(`/jobs?page=${page}&limit=10`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setJobs(d.data)
          setMeta(d.meta)
        } else {
          setJobs(Array.isArray(d) ? d : [])
        }
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [page])

  const filtered = jobs.filter(j => !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.department?.toLowerCase().includes(search.toLowerCase()))

  return (
    <AppShell portal="hiring" pageTitle="Job Postings">
      <div className="page-header">
        <div>
          <div className="page-title">Job Postings</div>
          <div className="page-subtitle">{meta.total || jobs.length} positions across all departments</div>
        </div>
      </div>
      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <input className="hiris-input" placeholder="Search by title or department…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 340 }} />
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No job postings found</div>
        ) : (
          <>
            <table className="hiris-table">
            <thead><tr><th>Role</th><th>Department</th><th>Type</th><th>Manager</th><th>Candidates</th><th>Urgency</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.id}>
                  <td style={{ fontWeight: 600 }}>{j.title}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{j.department}</td>
                  <td><span className="badge badge-gray">{j.job_type}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{j.manager || '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--brand)' }}>{j.candidates_count}</td>
                  <td><span className={`badge ${URGENCY_BADGE[j.urgency] || 'badge-gray'}`}>{j.urgency}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[j.status] || 'badge-gray'}`}>{j.status}</span></td>
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
