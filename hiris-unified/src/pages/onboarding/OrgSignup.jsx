import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

/* ── Default role templates ─────────────────────────────────────────────────── */
const DEFAULT_ROLES = [
  {
    key: 'chro', label: 'CHRO / HR Head', color: '#28666E',
    desc: 'Manages the overall hiring strategy, conducts final interviews, and approves all offers.',
    perms: { can_request_jobs: false, can_build_jd: false, can_review_jd: true, can_conduct_interview: true, can_make_final_decision: true },
  },
  {
    key: 'hiring-manager', label: 'Hiring Manager', color: 'var(--text-primary)',
    desc: 'Prepares job descriptions, manages the application portal, and shortlists candidates.',
    perms: { can_request_jobs: false, can_build_jd: true, can_review_jd: false, can_conduct_interview: false, can_make_final_decision: false },
  },
  {
    key: 'department-leader', label: 'Department Leader / Professor', color: 'var(--text-secondary)',
    desc: 'Submits hiring requests, reviews JDs, conducts technical interviews.',
    perms: { can_request_jobs: true, can_build_jd: false, can_review_jd: true, can_conduct_interview: true, can_make_final_decision: false },
  },
]

const PERM_LABELS = {
  can_request_jobs:       'Request Jobs',
  can_build_jd:           'Build JDs',
  can_review_jd:          'Review JDs',
  can_conduct_interview:  'Conduct Interviews',
  can_make_final_decision:'Final Decision',
}

const ORG_SIZES = ['1–50', '51–200', '201–500', '500+']
const INDUSTRIES = ['Higher Education', 'Research Institute', 'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Government', 'Other']

const STEPS = [
  { n: 1, title: 'Organisation', icon: 'domain' },
  { n: 2, title: 'Roles',         icon: 'manage_accounts' },
  { n: 3, title: 'Invite Users',  icon: 'group_add' },
]

// Replaced localStorage with real API connection

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function OrgSignup() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Step 1
  const [org, setOrg] = useState({ name: '', website: '', industry: 'Higher Education', size: '51–200' })

  // Step 2
  const [roles, setRoles] = useState(DEFAULT_ROLES)

  // Step 3
  const [invites, setInvites] = useState([
    { roleKey: 'chro', email: '', name: '', password: '' },
    { roleKey: 'hiring-manager', email: '', name: '', password: 'changeme123' },
    { roleKey: 'department-leader', email: '', name: '', password: 'changeme123' },
  ])

  const addInvite = () => setInvites(i => [...i, { roleKey: roles[0].key, email: '', name: '' }])
  const removeInvite = idx => setInvites(i => i.filter((_, j) => j !== idx))
  const updateInvite = (idx, field, val) => setInvites(i => i.map((inv, j) => j === idx ? { ...inv, [field]: val } : inv))

  async function handleLaunch() {
    setError('')
    setBusy(true)

    const users = invites
      .filter(i => i.email.trim() && i.password.trim())
      .map(i => {
        const portal = i.roleKey === 'chro' ? 'chro' : i.roleKey === 'hiring-manager' ? 'hiring' : 'faculty'
        return {
          email: i.email.trim().toLowerCase(),
          name: i.name.trim() || i.email.split('@')[0],
          role: i.roleKey === 'hiring-manager' ? 'hiring_manager' : i.roleKey === 'department-leader' ? 'faculty' : 'chro',
          portal,
          password: i.password
        }
      })

    if (users.length === 0) {
      setError('Please provide at least one valid user with an email and password.')
      setBusy(false)
      return
    }

    try {
      const res = await apiFetch('/auth/register-org', {
        method: 'POST',
        body: JSON.stringify({
          org,
          roles,
          users,
          // Include registration secret when configured (required in production)
          ...(import.meta.env.VITE_REGISTRATION_SECRET
            ? { registration_secret: import.meta.env.VITE_REGISTRATION_SECRET }
            : {}),
        })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create organisation')

      // Login automatically as the created admin
      setUser(data.user)
      navigate(`/${data.user.portal}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const progress = (step / 3) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)', fontFamily: 'var(--font-body)' }}>
      {/* Simple Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>H</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>HIRIS</div>
        </div>
        <Link to="/login" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}>Already have an account? Login</Link>
      </div>

      <div style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 24px' }}>

          {/* Progress header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-h)' }}>Set Up Your Organisation</h1>
              <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 600 }}>Step {step} of 3</span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--teal)', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            {/* Step pills */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${s.n === step ? 'var(--teal)' : s.n < step ? 'rgba(40,102,110,0.3)' : 'var(--border)'}`, background: s.n === step ? 'var(--teal-10)' : 'transparent', color: s.n === step ? 'var(--teal)' : s.n < step ? 'var(--teal-dark)' : 'var(--slate-400)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{s.n < step ? 'check_circle' : s.icon}</span>
                  {s.title}
                </div>
              ))}
            </div>
          </div>

          {/* ── Step 1: Org Basics ── */}
          {step === 1 && (
            <StepCard title="Organisation Details" desc="Tell us about your organisation. This information will appear across your HIRIS workspace.">
              <FormField label="Organisation Name" required>
                <input style={inputStyle} placeholder="e.g. National Institute of Technology" value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))} />
              </FormField>
              <FormField label="Website URL">
                <input style={inputStyle} placeholder="https://www.yourorganisation.ac.in" value={org.website} onChange={e => setOrg(o => ({ ...o, website: e.target.value }))} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <FormField label="Industry">
                  <select style={inputStyle} value={org.industry} onChange={e => setOrg(o => ({ ...o, industry: e.target.value }))}>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </FormField>
                <FormField label="Organisation Size">
                  <select style={inputStyle} value={org.size} onChange={e => setOrg(o => ({ ...o, size: e.target.value }))}>
                    {ORG_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
              <NavButtons onNext={() => setStep(2)} nextDisabled={!org.name.trim()} />
            </StepCard>
          )}

          {/* ── Step 2: Role Definition ── */}
          {step === 2 && (
            <StepCard title="Define Roles & Permissions" desc="These roles determine who can do what within your hiring workflows. You can customise permissions or add new roles.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {roles.map((role, ri) => (
                  <div key={role.key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--teal-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--teal)' }}>badge</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{role.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>{role.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(role.perms).map(([key, val]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: `1px solid ${val ? 'rgba(40,102,110,0.3)' : 'var(--border)'}`, background: val ? 'var(--teal-10)' : 'var(--slate-50)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: val ? 'var(--teal)' : 'var(--slate-500)' }}>
                          <input type="checkbox" checked={val} onChange={e => setRoles(prev => prev.map((r, j) => j === ri ? { ...r, perms: { ...r.perms, [key]: e.target.checked } } : r))} style={{ accentColor: 'var(--teal)', width: 12, height: 12 }} />
                          {PERM_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
            </StepCard>
          )}

          {/* ── Step 3: Invite Users ── */}
          {step === 3 && (
            <StepCard title="Invite Your Team" desc="Add the people who will use HIRIS. They will receive login credentials to their respective portals.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {error && <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 8, fontSize: 13 }}>{error}</div>}
                
                {invites.map((inv, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px 36px', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input style={inputStyle} placeholder="Full name" value={inv.name} onChange={e => updateInvite(i, 'name', e.target.value)} />
                    <input style={inputStyle} placeholder="Email address" type="email" value={inv.email} onChange={e => updateInvite(i, 'email', e.target.value)} />
                    <input style={inputStyle} placeholder="Password" type="password" value={inv.password} onChange={e => updateInvite(i, 'password', e.target.value)} />
                    <select style={inputStyle} value={inv.roleKey} onChange={e => updateInvite(i, 'roleKey', e.target.value)}>
                      {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <button onClick={() => removeInvite(i)} style={{ height: 38, width: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addInvite} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--brand)', background: 'transparent', color: 'var(--brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Another User
              </button>
              
              <NavButtons onBack={() => setStep(2)} onNext={handleLaunch} nextLabel={busy ? 'Launching...' : 'Launch Workspace'} nextDisabled={busy} />
            </StepCard>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function StepCard({ title, desc, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '36px 36px 28px', boxShadow: 'var(--shadow-sm)' }}>
      <h2 style={{ fontSize: '1.3rem', marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 28, lineHeight: 1.6 }}>{desc}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  )
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function NavButtons({ onBack, onNext, nextDisabled, nextLabel = 'Continue' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      {onBack ? (
        <button onClick={onBack} className="btn-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>Back</button>
      ) : <div />}
      <button onClick={onNext} disabled={nextDisabled} className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, opacity: nextDisabled ? 0.5 : 1, cursor: nextDisabled ? 'not-allowed' : 'pointer' }}>
        {nextLabel}
      </button>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 13px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, color: 'var(--navy)', background: 'var(--surface)',
  outline: 'none', fontFamily: 'var(--font-body)',
  transition: 'border-color 0.15s', boxSizing: 'border-box',
}
