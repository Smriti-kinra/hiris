import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

/**
 * CHROOverview — Redesigned with premium HIRIS aesthetics.
 * This version brings the landing page's vibrant design to the internal portal.
 */
export default function CHROOverview() {
  const [pipeline, setPipeline] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/chro/pipeline').then(r => r.json()).catch(() => ({})),
      apiFetch('/hiring-requests').then(r => r.json()).catch(() => []),
    ]).then(([p, req]) => { 
      setPipeline(p); 
      setRequests(Array.isArray(req) ? req : []) 
    }).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Open Positions',      value: pipeline?.total_open_positions ?? '—', icon: 'work_outline', color: 'var(--brand)' },
    { label: 'Offers Pending',      value: pipeline?.offers_pending        ?? '—', icon: 'pending_actions', color: 'var(--accent-amber)' },
    { label: 'Hired This Cycle',    value: pipeline?.hires_this_month      ?? '—', icon: 'person_add', color: 'var(--accent-green)' },
    { label: 'Avg. Days to Hire',   value: pipeline?.avg_time_to_hire_days ?? '—', icon: 'speed', color: 'var(--accent-blue)' },
  ]

  const statusGroups = ['Pending Review', 'Sent for Approval', 'Approved', 'Rejected']
    .map(s => ({ label: s, count: requests.filter(r => r.status === s).length }))

  if (loading) return (
    <AppShell portal="chro" pageTitle="Hiring Overview">
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <div className="spinner" />
      </div>
    </AppShell>
  )

  return (
    <AppShell portal="chro" pageTitle="Hiring Overview">
      <div style={{ margin: '-24px -24px 0 -24px' }}>
        
        {/* ── PREMIUM HEADER ────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(135deg, var(--bg-sidebar) 0%, var(--brand-hover) 100%)',
          padding: '48px 24px 80px 24px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Grid Pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.05,
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '30px 30px', pointerEvents: 'none',
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="badge" style={{ 
              marginBottom: 16, 
              background: 'rgba(255,255,255,0.1)', 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.2)',
              fontSize: 10,
              letterSpacing: '0.05em'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>analytics</span>
              SYSTEM ANALYTICS
            </div>
            <h1 style={{ color: 'white', fontSize: 32, marginBottom: 8, letterSpacing: '-0.02em' }}>Organisation Hiring Overview</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, maxWidth: 600 }}>
              Real-time visibility into the institutional hiring pipeline and departmental requests.
            </p>
          </div>
        </section>

        {/* ── STATS GRID (Overlapping) ────────────────────────────────── */}
        <div style={{ padding: '0 24px', marginTop: -40, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {statCards.map(s => (
              <div className="card" key={s.label} style={{ 
                padding: 24, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12,
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: 10, 
                  background: `${s.color}15`, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-h)' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
          
          {/* Breakdown Card */}
          <div className="card card-pad" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 16 }}>Pipeline Breakdown</h3>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Cycle</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {statusGroups.map((g, i) => {
                const colors = ['var(--accent-amber)', 'var(--accent-blue)', 'var(--accent-green)', 'var(--accent-red)']
                return (
                  <div key={g.label} style={{ 
                    padding: '16px', 
                    borderRadius: 12, 
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i], boxShadow: `0 0 10px ${colors[i]}50` }} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: colors[i], textTransform: 'uppercase', letterSpacing: '0.02em' }}>{g.label}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{g.count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Requests Card */}
          <div className="card card-pad" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 16 }}>Recent Hiring Requests</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View All</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {requests.slice(0, 5).map((r, i) => {
                const statusColors = {
                  'Pending Review': 'var(--accent-amber)',
                  'Sent for Approval': 'var(--accent-blue)',
                  'Approved': 'var(--accent-green)',
                  'Rejected': 'var(--accent-red)'
                }
                const sColor = statusColors[r.status] || 'var(--text-muted)'
                
                return (
                  <div key={r.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '14px 0', 
                    borderBottom: i < 4 ? '1px solid var(--border)' : 'none' 
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>corporate_fare</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.department} · {r.requested_by}</div>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: 10.5, 
                      fontWeight: 800, 
                      color: sColor, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}>
                      {r.status}
                    </span>
                  </div>
                )
              })}
              {requests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No recent requests found.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}

/* 
REVERSAL NOTE:
The original layout was a simpler white-background dashboard. 
To revert, replace the return statement with the old one using standard page-header, stat-grid, and card classes.
*/

