import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STAGE_BADGE = {
  Applied:   'badge-gray',
  Screening: 'badge-amber',
  Interview: 'badge-blue',
  Offer:     'badge-green',
  Hired:     'badge-green',
  Rejected:  'badge-red',
}

export default function HiringCandidates() {
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
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell portal="hiring" pageTitle="Candidates">
      <div className="page-header">
        <div>
          <div className="page-title">Candidates</div>
          <div className="page-subtitle">{candidates.length} candidates across all roles</div>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            className="hiris-input"
            placeholder="Search by name or role…"
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
          <div className="empty-state">No candidates found</div>
        ) : (
          <table className="hiris-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role Applied</th>
                <th>Source</th>
                <th>Applied</th>
                <th>Stage</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                        {c.name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.role || c.applied_for || '—'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.source || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {c.applied_at ? new Date(c.applied_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${STAGE_BADGE[c.stage] || 'badge-gray'}`}>
                      {c.stage || 'Applied'}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}
