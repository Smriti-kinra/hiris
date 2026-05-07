import { useState } from 'react'
import { apiFetch } from '../services/api'

/**
 * ApproveRejectModal
 * Props:
 *   request  – the hiring-request object { id, title, department, requested_by, status }
 *   action   – 'approve' | 'reject'
 *   onClose  – called when the user cancels
 *   onSuccess– called with the updated request object after a successful API call
 */
export default function ApproveRejectModal({ request, action, onClose, onSuccess }) {
  const [notes, setNotes] = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const isApprove = action === 'approve'

  const overlayStyle = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1100, padding: 24,
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8, fontSize: 13.5,
    color: 'var(--text-primary)',
    fontFamily: 'inherit', outline: 'none',
    resize: 'vertical', minHeight: 80,
  }

  async function handleConfirm() {
    setBusy(true); setError('')
    try {
      const res  = await apiFetch(`/hiring-requests/${request.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      onSuccess({ ...request, status: data.status })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: '100%', maxWidth: 460 }}>

        {/* Header */}
        <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: isApprove ? 'var(--accent-green)' : 'var(--accent-red)',
                color: '#fff', fontSize: 15, flexShrink: 0,
              }}>
                {isApprove ? '✓' : '✕'}
              </span>
              {isApprove ? 'Approve Request' : 'Reject Request'}
            </div>
            <div className="card-sub" style={{ marginTop: 4 }}>
              This action will update the request status immediately.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Body */}
        <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Request summary */}
          <div style={{ background: 'var(--bg-active)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{request.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {request.department}
              {request.requested_by && <> · Requested by <strong>{request.requested_by}</strong></>}
            </div>
            <span className={`badge ${
              request.status === 'Approved'         ? 'badge-green' :
              request.status === 'Sent for Approval'? 'badge-blue'  :
              request.status === 'Rejected'         ? 'badge-red'   : 'badge-amber'
            }`} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
              {request.status}
            </span>
          </div>

          {/* Notes field */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isApprove ? 'Approval Notes (optional)' : 'Reason for Rejection (optional)'}
            </label>
            <textarea
              style={inputStyle}
              placeholder={isApprove ? 'Add any conditions or comments…' : 'Explain why the request is being rejected…'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn"
              style={{
                background: isApprove ? 'var(--accent-green)' : 'var(--accent-red)',
                color: '#fff',
                opacity: busy ? 0.7 : 1,
              }}
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? (isApprove ? 'Approving…' : 'Rejecting…') : (isApprove ? 'Confirm Approval' : 'Confirm Rejection')}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
