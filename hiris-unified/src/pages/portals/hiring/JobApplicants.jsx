import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STAGE_BADGE = {
  'Applied':              'badge-gray',
  'Under Review':         'badge-amber',
  'Technical Interview':  'badge-blue',
  'Behavioral Interview': 'badge-purple',
  'Final Review':         'badge-green',
  'Offered':              'badge-green',
  'Rejected':             'badge-red',
}

export default function JobApplicants() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!jobId) return
    Promise.all([
      apiFetch(`/jobs`).then(r => r.json()).then(d => (Array.isArray(d) ? d : []).find(j => j.id === jobId)),
      apiFetch(`/jobs/${jobId}/candidates`).then(r => r.json())
    ])
      .then(([jobData, candData]) => {
        setJob(jobData || null)
        setCandidates(Array.isArray(candData) ? candData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId])

  return (
    <AppShell portal="hiring" pageTitle={job ? `Applicants — ${job.title}` : 'Applicants'}>
      <button onClick={() => navigate('/hiring/posted-jobs')} className="btn btn-outline" style={{ marginBottom: 20, padding: '6px 14px', fontSize: 13 }}>
        ← Back to Posted Jobs
      </button>

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title">{job?.title || 'Job Applicants'}</div>
          <div className="page-subtitle">{job?.department} · {candidates.length} applicant{candidates.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : candidates.length === 0 ? (
          <div className="empty-state">No applicants for this role yet.</div>
        ) : (
          <table className="hiris-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Stage</th>
                <th>Score</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/hiring/candidates/${c.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                        {c.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                        {c.headline && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.headline}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${STAGE_BADGE[c.stage] || 'badge-gray'}`}>{c.stage}</span>
                  </td>
                  <td>
                    {c.score != null ? (
                      <span style={{ fontWeight: 700, fontSize: 13, color: c.score >= 75 ? 'var(--accent-green)' : c.score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                        {c.score}%
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.applied_at ? new Date(c.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
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
