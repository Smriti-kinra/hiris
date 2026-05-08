import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

export default function HiringArchive() {
  const [expiredJobs, setExpiredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    apiFetch('/archive/expired-jobs')
      .then(r => r.ok ? r.json() : [])
      .then(data => setExpiredJobs(Array.isArray(data) ? data : []))
      .catch(() => setExpiredJobs([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredJobs = expiredJobs.filter(job =>
    !search ||
    String(job.title || job.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(job.department || '').toLowerCase().includes(search.toLowerCase()) ||
    String(job.location || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell portal="hiring" pageTitle="Archive">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">Archive</div>
          <div className="page-subtitle">Expired openings and archived candidate history for hiring review.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <input
          className="hiris-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search expired openings..."
          style={{ flex: 1, minWidth: 260 }}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <table className="hiris-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Department</th>
                <th>Location</th>
                <th>Expired On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No archived job openings found.
                  </td>
                </tr>
              ) : filteredJobs.map(job => (
                <tr key={job.id || job.job_id || job.title}>
                  <td>{job.title || job.name || 'Untitled role'}</td>
                  <td>{job.department || '—'}</td>
                  <td>{job.location || 'Remote'}</td>
                  <td>{job.expired_at ? new Date(job.expired_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td>{job.status || 'Archived'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}
