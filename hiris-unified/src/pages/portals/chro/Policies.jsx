import { useState, useEffect } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const CATEGORY_COLOR = { Interviewing: 'badge-blue', Approvals: 'badge-amber', Offers: 'badge-green', Diversity: 'badge-purple', Compliance: 'badge-red', Compensation: 'badge-gray' }

export default function CHROPolicies() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading]   = useState(true)
  const [active, setActive]     = useState(null)

  useEffect(() => {
    apiFetch('/policies').then(r => r.json()).then(d => setPolicies(Array.isArray(d) ? d : [])).catch(() => setPolicies([])).finally(() => setLoading(false))
  }, [])

  const grouped = policies.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc }, {})

  return (
    <AppShell portal="chro" pageTitle="Policies">
      <div className="page-header">
        <div><div className="page-title">Hiring Policies</div><div className="page-subtitle">{policies.length} active policies across {Object.keys(grouped).length} categories</div></div>
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div className="card" key={category}>
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${CATEGORY_COLOR[category] || 'badge-gray'}`}>{category}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} {items.length === 1 ? 'policy' : 'policies'}</span>
              </div>
              {items.map(p => (
                <div key={p.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => setActive(active === p.id ? null : p.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{p.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Effective {new Date(p.effective).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span style={{ fontSize: 18, color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: active === p.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>›</span>
                    </div>
                  </div>
                  {active === p.id && <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.description}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
