import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import { useAuth } from '../../context/AuthContext'
import hirisLogo from '../../assets/hiris-logo.svg'

const DEMO_ACCOUNTS = [
  {
    email: 'smriti.kinra@hiris.demo',
    label: 'Chief HR Officer',
    roleName: 'CHRO Portal',
    portal: 'chro',
    icon: 'shield_person',
    color: '#A78BFA', // purple
    badgeBg: 'rgba(167, 139, 250, 0.15)',
    desc: 'Access global hiring analytics, manage organisation security/role definitions, oversee cross-department headcount requests, and conduct final structural reviews.',
    features: ['Institutional Analytics', 'Policy Management', 'Role Access Controls', 'Final Decisioning']
  },
  {
    email: 'sartajdeep.singh@hiris.demo',
    label: 'Hiring Manager',
    roleName: 'Hiring Operations Portal',
    portal: 'hiring',
    icon: 'manage_accounts',
    color: '#38BDF8', // blue/sky
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    desc: 'Draft comprehensive job descriptions, build custom hiring pipelines, launch public branded candidate portals, screen AI-ranked candidates, and schedule multi-stage interviews.',
    features: ['JD & Pipeline Builder', 'Candidate Profiles', 'Interview Scheduling', 'Stage Management']
  },
  {
    email: 'gracy.tanna@hiris.demo',
    label: 'Faculty Member',
    roleName: 'Department & Interview Portal',
    portal: 'faculty',
    icon: 'school',
    color: '#2DD4BF', // teal
    badgeBg: 'rgba(45, 212, 191, 0.15)',
    desc: 'Submit headcount requests for departmental growth, review and comment on drafted JDs, evaluate candidates, and conduct live structured technical/behavioral interviews with real-time AI rubrics.',
    features: ['Headcount Requests', 'JD Collaborations', 'Live Interview Rooms', 'Evaluation Rubrics']
  }
]

const DEMO_PASSWORD = 'hiris2026'

export default function GetStartedPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [busyEmail, setBusyEmail] = useState(null)
  const [error, setError] = useState('')

  async function handleDemoLogin(account) {
    setError('')
    setBusyEmail(account.email)
    try {
      const user = await login(account.email, DEMO_PASSWORD)
      const dest = user?.home_path || `/${user?.portal || 'dashboard'}`
      if (dest.startsWith('http')) {
        window.location.href = dest
      } else {
        navigate(dest, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Demo login failed. Please try again.')
      setBusyEmail(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', transition: 'background 0.3s' }}>
      <Navbar />

      <main style={{ paddingTop: 110, paddingBottom: 80 }}>
        <div className="container" style={{ maxWidth: 1040 }}>
          {/* Header Section */}
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="badge" style={{ marginBottom: 16, background: 'var(--teal-10)', color: 'var(--teal)', border: '1px solid rgba(40,102,110,0.25)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>rocket_launch</span>
              Welcome to HIRIS
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: 14, letterSpacing: '-0.5px' }}>
              Choose your path to get started
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
              Explore the HIRIS ecosystem instantly with our rich, pre-loaded demo accounts or set up a custom workspace configured specifically for your organisation.
            </p>
          </div>

          {error && (
            <div style={{ maxWidth: 680, margin: '0 auto 24px', padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>error</span>
              {error}
            </div>
          )}

          {/* Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40 }}>
            
            {/* Section 1: Pre-loaded Demo Portals */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--teal-10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--teal)' }}>auto_awesome</span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Option 1: Explore with Pre-loaded Demo Accounts</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 24 }}>
                {DEMO_ACCOUNTS.map(account => {
                  const isBusy = busyEmail === account.email
                  const isAnyBusy = !!busyEmail
                  return (
                    <div 
                      key={account.email} 
                      className="card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        padding: 24, 
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        borderRadius: 16,
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        opacity: isAnyBusy && !isBusy ? 0.6 : 1,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                        e.currentTarget.style.borderColor = account.color
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      {/* Card Top */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ 
                          width: 44, height: 44, borderRadius: 10, 
                          background: account.badgeBg, display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <span className="material-symbols-outlined" style={{ color: account.color, fontSize: 24 }}>
                            {account.icon}
                          </span>
                        </div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{account.label}</h3>
                          <div style={{ fontSize: 11, fontWeight: 700, color: account.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                            {account.roleName}
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1, marginBottom: 20 }}>
                        {account.desc}
                      </p>

                      {/* Core Modules List */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                        {account.features.map(f => (
                          <span 
                            key={f} 
                            style={{ 
                              fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', 
                              background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 6,
                              border: '1px solid var(--border)'
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* Launch Button */}
                      <button
                        onClick={() => handleDemoLogin(account)}
                        disabled={isAnyBusy}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px',
                          borderRadius: 10,
                          border: `1.5px solid ${account.color}`,
                          background: isBusy ? 'var(--bg-hover)' : 'transparent',
                          color: account.color,
                          fontSize: 13.5,
                          fontWeight: 700,
                          cursor: isAnyBusy ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={e => {
                          if (!isAnyBusy) {
                            e.currentTarget.style.background = account.color
                            e.currentTarget.style.color = '#FFFFFF'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isAnyBusy) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = account.color
                          }
                        }}
                      >
                        {isBusy ? (
                          <>
                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            <span>Launching Portal...</span>
                          </>
                        ) : (
                          <>
                            <span>Launch Demo Portal</span>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Section 2: Custom Organisation Onboarding */}
            <div style={{ maxWidth: 820, margin: '0 auto', width: '100%' }}>
              <div style={{ 
                background: 'var(--surface)', 
                border: '1px solid var(--border)', 
                borderRadius: 20, 
                padding: '36px',
                boxShadow: 'var(--shadow-md)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 32,
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#3B82F6' }}>domain</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Workspace Setup</span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>Set Up a New Organisation</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 0 }}>
                    Create a brand new workspace specifically configured for your institution. Customise permissions, build bespoke hiring pipeline stages, and invite your team members.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, color: 'var(--text-secondary)' }}>1</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Enter basics & details</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Name, website URL, industry sector & headcount size</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, color: 'var(--text-secondary)' }}>2</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Customise Roles & Access</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Tailor permissions and visible candidate pipeline stages</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, color: 'var(--text-secondary)' }}>3</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Invite your core team</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Generate initial login credentials and send invitations</div>
                    </div>
                  </div>

                  <Link 
                    to="/onboarding" 
                    className="btn btn-primary" 
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center', 
                      padding: '13px', 
                      borderRadius: 10,
                      fontWeight: 700, 
                      fontSize: 13.5,
                      marginTop: 8
                    }}
                  >
                    <span>Begin Custom Onboarding</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
