import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../../components/AppShell'
import { apiFetch } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'

const REC_COLOR = { strong_hire: '#10B981', hire: '#10B981', neutral: '#F59E0B', no_hire: '#EF4444' }
const REC_LABEL = { strong_hire: 'Strong Hire', hire: 'Hire', neutral: 'Neutral', no_hire: 'No Hire' }

export default function CHROInterviews() {
  const navigate = useNavigate()
  const toast = useToast()

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [activeTab, setActiveTab]   = useState('pipeline') // 'pipeline' | 'schedule'
  const [scheduledInterviews, setScheduledInterviews] = useState([])
  const [scheduling, setScheduling] = useState(null) // applicationId being scheduled

  // Fetch final-review pipeline candidates
  const loadPipeline = useCallback(() => {
    console.log('[CHRO] Fetching final interview pipeline...')
    setLoading(true)
    apiFetch('/pipeline/final-interview')
      .then(r => r.json())
      .then(d => {
        console.log(`[CHRO] Found ${Array.isArray(d) ? d.length : 0} candidates in final_review`)
        setCandidates(Array.isArray(d) ? d : [])
      })
      .catch(err => {
        console.error('[CHRO] Pipeline fetch error:', err)
        setCandidates([])
      })
      .finally(() => setLoading(false))
  }, [])

  // Fetch existing scheduled interviews
  const loadScheduled = useCallback(() => {
    apiFetch('/interviews?active=true')
      .then(r => r.json())
      .then(d => setScheduledInterviews(Array.isArray(d) ? d.filter(i => i.status === 'scheduled') : []))
      .catch(() => setScheduledInterviews([]))
  }, [])

  useEffect(() => {
    loadPipeline()
    loadScheduled()
  }, [loadPipeline, loadScheduled])

  const handleStartInterview = async (appId) => {
    const type = 'behavioral'
    const res = await apiFetch('/interviews/start', {
      method: 'POST',
      body: JSON.stringify({ application_id: appId, type })
    })
    if (res.ok) {
      const { id } = await res.json()
      navigate(`/interview-room/${type}/${id}`)
    } else {
      toast.error('Failed to start interview.')
    }
  }

  const handleScheduleInterview = async (applicationId) => {
    setScheduling(applicationId)
    try {
      const res = await apiFetch('/pipeline/schedule-final-interview', {
        method: 'POST',
        body: JSON.stringify({ application_id: applicationId })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to schedule')
      }
      toast.success('Final interview scheduled successfully!')
      loadPipeline()
      loadScheduled()
    } catch (err) {
      toast.error(err.message || 'Failed to schedule interview.')
    } finally {
      setScheduling(null)
    }
  }

  const filtered = candidates.filter(c =>
    !search ||
    c.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.department || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell portal="chro" pageTitle="Schedule">
      <div className="page-header">
        <div>
          <div className="page-title">Schedule</div>
          <div className="page-subtitle">
            {scheduledInterviews.length} scheduled interview{scheduledInterviews.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-outline" onClick={() => { loadPipeline(); loadScheduled(); toast.info('Refreshed') }} style={{ fontSize: 13 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>



      {/* Scheduled Interviews */}
      <div className="card">
          {scheduledInterviews.length === 0 ? (
            <div className="empty-state">No scheduled interviews</div>
          ) : (
            <table className="hiris-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Round</th>
                  <th>Interviewer</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledInterviews.map(i => (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.candidate_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{i.candidate_email}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 160 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.job_title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.department}</div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{i.round}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{i.interviewer_name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {i.scheduled_at ? new Date(i.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td><span className="badge badge-blue">{i.status}</span></td>
                    <td>
                      <button
                        onClick={() => handleStartInterview(i.application_id)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        Start Interview
                      </button>
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
