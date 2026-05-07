import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const URGENCY_BADGE = { urgent: 'badge-red', high: 'badge-amber', medium: 'badge-blue', low: 'badge-gray' }

export default function FacultyJDReviews() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiFetch('/hiring-requests').then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.data || [])
        setRequests(list.filter(r => r.status === 'Sent for Approval' && r.requested_by_id === user.id))
      })
      .catch(() => setRequests([])).finally(() => setLoading(false))
  }, [user])

  return (
    <AppShell portal="faculty" pageTitle="JD Reviews">
      <div className="page-header">
        <div>
          <div className="page-title">JD Reviews</div>
          <div className="page-subtitle">Job descriptions awaiting faculty review and approval</div>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : requests.length === 0 ? <div className="empty-state">No job descriptions pending review</div>
        : (
          <table className="hiris-table">
            <thead><tr><th>Role</th><th>Department</th><th>Type</th><th>Positions</th><th>Requester</th><th>Submitted</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.department}</td>
                  <td><span className="badge badge-gray">{r.job_type}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 700 }}>{r.positions}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.requested_by || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigate(`/faculty/jd-builder?requestId=${r.id}`)} className="btn btn-outline" style={{ padding: '5px 12px', fontSize: 12 }}>Review</button>
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
