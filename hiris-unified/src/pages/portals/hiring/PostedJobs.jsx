import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const STATUS_COLOR = {
  active:  { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
  pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' },
  closed:  { bg: 'rgba(107, 114, 128, 0.1)', text: '#6B7280', border: 'rgba(107, 114, 128, 0.2)' },
}

export default function PostedJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/jobs')
      .then(r => r.json())
      .then(d => setJobs(Array.isArray(d) ? d.filter(j => j.status === 'active') : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell portal="hiring" pageTitle="Posted Jobs">
      <div className="page-header" style={{ marginBottom: 30 }}>
        <div>
          <div className="page-title">Posted Jobs</div>
          <div className="page-subtitle">Manage active recruitment for {jobs.length} role{jobs.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 16 }}>💼</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>No active postings</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Get started by creating a new hiring request.</div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 20 
        }}>
          {jobs.map(j => {
            const status = STATUS_COLOR[j.status] || STATUS_COLOR.closed
            return (
              <div 
                key={j.id} 
                className="card"
                onClick={() => navigate(`/hiring/posted-jobs/${j.id}`)}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div className="card-pad" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ 
                      background: status.bg, 
                      color: status.text, 
                      border: `1px solid ${status.border}`,
                      padding: '4px 10px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 700, 
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {j.status}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {j.posted_at ? new Date(j.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                    {j.title}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
                    <span>{j.department}</span>
                    <span style={{ opacity: 0.3 }}>•</span>
                    <span>{j.job_type || 'Full-time'}</span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    paddingTop: 16, 
                    borderTop: '1px solid var(--border-light)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand)' }}>
                          {j.candidates_count ?? 0}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Applicants
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      background: 'var(--bg-hover)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
