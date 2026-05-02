import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const URGENCY_BADGE = { urgent: 'badge-red', high: 'badge-amber', medium: 'badge-blue', low: 'badge-gray' }

export default function FacultyJDReviews() {
  const [jobs, setJobs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/jobs').then(r => r.json())
      .then(d => setJobs(Array.isArray(d) ? d.filter(j => j.status === 'pending' || j.description) : []))
      .catch(() => setJobs([])).finally(() => setLoading(false))
  }, [])

  return (
    <AppShell portal="faculty" pageTitle="JD Reviews">
      <div className="page-header">
        <div>
          <div className="page-title">JD Reviews</div>
          <div className="page-subtitle">Job descriptions awaiting faculty review and approval</div>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : jobs.length === 0 ? <div className="empty-state">No job descriptions pending review</div>
        : (
          <table className="hiris-table">
            <thead><tr><th>Role</th><th>Department</th><th>Type</th><th>Urgency</th><th>Manager</th><th>Posted</th><th>Action</th></tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td style={{ fontWeight: 600 }}>{j.title}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{j.department}</td>
                  <td><span className="badge badge-gray">{j.job_type}</span></td>
                  <td><span className={`badge ${URGENCY_BADGE[j.urgency] || 'badge-gray'}`}>{j.urgency}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{j.manager || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {j.posted_at ? new Date(j.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: 12 }}>Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}
