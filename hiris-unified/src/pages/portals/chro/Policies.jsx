import { useState, useEffect, useRef } from 'react'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'

const CATEGORY_COLOR = {
  Interviewing: 'badge-blue', Approvals: 'badge-amber', Offers: 'badge-green',
  Diversity: 'badge-purple', Compliance: 'badge-red', Compensation: 'badge-gray',
}

function UploadModal({ onClose, onUploaded }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !file) { setError('Both title and file are required.'); return }
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('title', title)
    fd.append('document', file)
    try {
      const res = await fetch('/api/chro/institutional-values', {
        method: 'POST', body: fd, credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onUploaded(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 480, margin: 0 }}>
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Upload Institutional Values PDF</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent-red)' }}>{error}</div>}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Document Title</label>
              <input className="hiris-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Institutional Values 2026" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>PDF File</label>
              <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} className="hiris-input" style={{ padding: '8px 12px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
              <button type="submit" disabled={uploading} className="btn btn-primary">{uploading ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CHROPolicies() {
  const [policies, setPolicies]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [active, setActive]             = useState(null)
  const [ivDoc, setIvDoc]               = useState(null)
  const [ivHistory, setIvHistory]       = useState([])
  const [showUpload, setShowUpload]     = useState(false)
  const [ivLoading, setIvLoading]       = useState(true)

  useEffect(() => {
    apiFetch('/policies').then(r => r.json()).then(d => setPolicies(Array.isArray(d) ? d : [])).catch(() => setPolicies([])).finally(() => setLoading(false))
    loadIV()
  }, [])

  function loadIV() {
    setIvLoading(true)
    Promise.all([
      apiFetch('/chro/institutional-values').then(r => r.ok ? r.json() : null).catch(() => null),
      apiFetch('/chro/institutional-values/history').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([doc, hist]) => { setIvDoc(doc); setIvHistory(hist) }).finally(() => setIvLoading(false))
  }

  const grouped = policies.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc }, {})

  return (
    <AppShell portal="chro" pageTitle="Policies">
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={(doc) => { setShowUpload(false); loadIV() }} />}

      <div className="page-header">
        <div>
          <div className="page-title">Hiring Policies</div>
          <div className="page-subtitle">{policies.length} active policies across {Object.keys(grouped).length} categories</div>
        </div>
      </div>

      {/* Institutional Values PDF Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Institutional Values</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Upload and manage the official institutional values document</div>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            {ivDoc ? 'Upload New Version' : 'Upload Document'}
          </button>
        </div>
        <div className="card-pad">
          {ivLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>
          ) : ivDoc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth={1.5}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ivDoc.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Version {ivDoc.version} · Uploaded {new Date(ivDoc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <a href={`/api/chro/institutional-values/${ivDoc.id}/download`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>
                  View / Download
                </a>
              </div>
              {ivHistory.length > 1 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Version History</div>
                  {ivHistory.slice(1).map(h => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{h.title} — v{h.version}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(h.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">No institutional values document uploaded yet.</div>
          )}
        </div>
      </div>

      {/* Hiring Policies */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div className="card" key={category}>
              <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${CATEGORY_COLOR[category] || 'badge-gray'}`}>{category}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} {items.length === 1 ? 'policy' : 'policies'}</span>
              </div>
              {items.map(p => (
                <div key={p.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setActive(active === p.id ? null : p.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
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
