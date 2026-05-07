import { useState } from 'react'
import { apiFetch } from '../services/api'

const DEPARTMENTS = ['Engineering', 'Computer Science', 'Life Sciences', 'Electrical Engg.', 'Design', 'Analytics', 'Marketing', 'Finance', 'Human Resources', 'Product']
const JOB_TYPES   = ['Full-time', 'Part-time', 'Contract']
const URGENCIES   = ['low', 'medium', 'high', 'urgent']

export default function NewRequestModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', department: '', job_type: 'Full-time', headcount: 1, urgency: 'medium', deadline: '', notes: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.department) return setError('Title and department are required.')
    setBusy(true); setError('')
    try {
      const res  = await apiFetch('/hiring-requests', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create request')
      onSuccess(data)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13.5, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const fieldStyle = { marginBottom: 16 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">New Hiring Request</div>
            <div className="card-sub">Submit a new headcount request for approval</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div className="card-pad">
          <form onSubmit={handleSubmit} noValidate>
            <div style={fieldStyle}>
              <label style={labelStyle}>Role Title *</label>
              <input style={inputStyle} placeholder="e.g. Senior Software Engineer" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Department *</label>
                <select style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Job Type</label>
                <select style={inputStyle} value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Positions</label>
                <input style={inputStyle} type="number" min="1" max="20" value={form.headcount} onChange={e => set('headcount', parseInt(e.target.value)||1)} />
              </div>
              <div>
                <label style={labelStyle}>Urgency</label>
                <select style={inputStyle} value={form.urgency} onChange={e => set('urgency', e.target.value)}>
                  {URGENCIES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase()+u.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Deadline</label>
                <input style={inputStyle} type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Any additional context…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            {error && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
