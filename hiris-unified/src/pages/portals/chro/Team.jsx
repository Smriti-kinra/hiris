import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const ROLE_BADGE = { hiring_manager: 'badge-blue', faculty: 'badge-gray' }
const ROLE_LABEL = { hiring_manager: 'Hiring Manager', faculty: 'Faculty' }

export default function CHROTeam() {
  const [team, setTeam]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/chro/team').then(r => r.json()).then(d => setTeam(Array.isArray(d) ? d : [])).catch(() => setTeam([])).finally(() => setLoading(false))
  }, [])

  return (
    <AppShell portal="chro" pageTitle="Team">
      <div className="page-header">
        <div><div className="page-title">Team Members</div><div className="page-subtitle">{team.length} active staff members with portal access</div></div>
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {team.map(m => (
            <div className="card card-pad" key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
                  {m.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge ${ROLE_BADGE[m.role] || 'badge-gray'}`}>{ROLE_LABEL[m.role] || m.role}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.active_requests > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>{m.active_requests}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>open requests</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                {m.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
