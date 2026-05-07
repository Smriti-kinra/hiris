import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch, assetUrl } from '../../../services/api'

const STAGE_BADGE = {
  'Applied':              'badge-gray',
  'Under Review':         'badge-amber',
  'Technical Interview':  'badge-blue',
  'Behavioral Interview': 'badge-purple',
  'Final Review':         'badge-green',
  'Offered':              'badge-green',
  'Rejected':             'badge-red',
}

export default function CHROCandidates() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    apiFetch('/candidates')
      .then(r => r.json())
      .then(d => setCandidates(Array.isArray(d) ? d : []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = candidates.filter(c =>
    !search || 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell portal="chro" pageTitle="Candidates">
      <div className="page-header">
        <div>
          <div className="page-title">Candidate Pipeline</div>
          <div className="page-subtitle">Monitoring {candidates.length} candidates across the institution</div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            className="hiris-input"
            placeholder="Search candidates by name or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No candidates found in the pipeline</div>
        ) : (
          <table className="hiris-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role Applied</th>
                <th>Applied</th>
                <th>Current Stage</th>
                <th>AI Score</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => navigate(`/chro/candidates/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                        {c.name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: c.stage === 'Offered' || c.stage === 'Final Review' ? '#10B981' : c.stage === 'Rejected' ? '#EF4444' : 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {c.role || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {c.applied_at ? new Date(c.applied_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${STAGE_BADGE[c.stage] || 'badge-gray'}`}>
                      {c.stage}
                    </span>
                  </td>
                  <td>
                    {c.score != null ? (
                      <span style={{
                        fontWeight: 700, fontSize: 13,
                        color: c.score >= 75 ? 'var(--accent-green)' : c.score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'
                      }}>{c.score}%</span>
                    ) : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {c.resume_path && (
                        <a href={assetUrl(c.resume_path)} target="_blank" rel="noreferrer" title="Download Resume" style={{ color: 'var(--brand)', display: 'flex' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
                        </a>
                      )}
                      {c.cv_path && (
                        <a href={assetUrl(c.cv_path)} target="_blank" rel="noreferrer" title="Download CV" style={{ color: 'var(--teal)', display: 'flex' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>article</span>
                        </a>
                      )}
                      {!c.resume_path && !c.cv_path && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
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
