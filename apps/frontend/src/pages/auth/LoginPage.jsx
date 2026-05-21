import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import { useAuth } from '../../context/AuthContext'
import hirisLogo from '../../assets/hiris-logo.svg'

// Portal URL map — reads from env (each portal sets these via its .env.* file)
const PORTAL_URLS = {
  faculty:         import.meta.env.VITE_PORTAL_URL_FACULTY   || null,
  hiring:          import.meta.env.VITE_PORTAL_URL_HIRING    || null,
  hiring_manager:  import.meta.env.VITE_PORTAL_URL_HIRING    || null,
  chro:            import.meta.env.VITE_PORTAL_URL_CHRO      || null,
  recruiter:       import.meta.env.VITE_PORTAL_URL_RECRUITER || null,
}

/**
 * Returns the URL the user should land on after login.
 * When running in multi-portal mode (env vars set), performs a hard cross-origin redirect.
 * Falls back to /dashboard (single-app mode) if env vars are absent.
 */
function getPostLoginDestination(user) {
  if (!user) return '/login'
  if (user.needsOnboarding || user.isNewUser || user.onboarding_required) return '/onboarding'
  const portalUrl = PORTAL_URLS[user.portal]
  if (portalUrl && portalUrl !== window.location.origin) {
    return portalUrl + (user.home_path || '')
  }
  return user.home_path || '/dashboard'
}

const DEMO_ACCOUNTS = [
  {
    email: 'smriti.kinra@hiris.demo',
    label: 'Chief HR Officer',
    role: 'chro',
    icon: 'shield_person',
    color: '#A78BFA',
    badgeBg: 'rgba(167, 139, 250, 0.15)',
    shortDesc: 'Oversee institutional analytics, policies, and role permissions.'
  },
  {
    email: 'sartajdeep.singh@hiris.demo',
    label: 'Hiring Manager',
    role: 'hiring',
    icon: 'manage_accounts',
    color: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    shortDesc: 'Create job descriptions, manage candidates, and coordinate pipelines.'
  },
  {
    email: 'gracy.tanna@hiris.demo',
    label: 'Faculty Member',
    role: 'faculty',
    icon: 'school',
    color: '#2DD4BF',
    badgeBg: 'rgba(45, 212, 191, 0.15)',
    shortDesc: 'Submit headcount requests, review JDs, and conduct interviews.'
  }
]
const DEMO_PASSWORD = 'hiris2026'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyDemoEmail, setBusyDemoEmail] = useState(null)
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      const dest = getPostLoginDestination(user)
      if (dest.startsWith('http')) {
        window.location.href = dest
      } else {
        navigate(dest, { replace: true })
      }
    }
  }, [loading, navigate, user])

  async function submitLogin(emailInput, passwordInput) {
    setError('')
    setBusy(true)
    try {
      const signedInUser = await login(emailInput.trim(), passwordInput)
      const dest = getPostLoginDestination(signedInUser)
      if (dest.startsWith('http')) {
        window.location.href = dest
      } else {
        navigate(dest, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Login failed')
      setBusy(false)
    }
  }

  async function handleQuickDemoLogin(account) {
    setError('')
    setBusyDemoEmail(account.email)
    setBusy(true)
    try {
      const signedInUser = await login(account.email, DEMO_PASSWORD)
      const dest = getPostLoginDestination(signedInUser)
      if (dest.startsWith('http')) {
        window.location.href = dest
      } else {
        navigate(dest, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Demo login failed')
      setBusyDemoEmail(null)
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return setError('Email is required.')
    if (!password.trim()) return setError('Password is required.')
    submitLogin(email, password)
  }

  if (loading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50)', fontFamily: 'var(--font-body)' }}>
      <Navbar />

      <main style={{ paddingTop: 100, paddingBottom: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 940, padding: '0 24px' }}>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
            gap: 32,
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 20, 
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}>
            
            {/* Left Panel: Credential Login */}
            <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ marginBottom: 28 }}>
                <div className="auth-logo-wrap" style={{ display: 'inline-flex', padding: '6px 12px', background: 'var(--brand)', borderRadius: 8, marginBottom: 16, height: 42, width: 96 }}>
                  <img className="auth-logo-img" src={hirisLogo} alt="HIRIS" />
                </div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 8, color: 'var(--navy)' }}>Sign in to HIRIS</h1>
                <p style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6, margin: 0 }}>
                  Enter your secure institutional credentials to continue to your dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="hiris-email" style={labelStyle}>Work Email</label>
                  <input
                    id="hiris-email"
                    type="email"
                    value={email}
                    disabled={busy}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="you@yourorg.com"
                    autoFocus
                    className="hiris-input"
                    style={{ borderColor: error ? '#EF4444' : undefined }}
                  />
                </div>

                <div>
                  <label htmlFor="hiris-password" style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="hiris-password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      disabled={busy}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Password"
                      className="hiris-input"
                      style={{ paddingRight: 54, borderColor: error ? '#EF4444' : undefined }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--slate-500)',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ fontSize: 12.5, color: '#EF4444', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={busy} 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, fontWeight: 700, display: 'flex', gap: 8 }}
                >
                  {busy && !busyDemoEmail ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      <span>Signing in...</span>
                    </>
                  ) : 'Continue'}
                </button>
              </form>

              <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--slate-500)' }}>
                New to HIRIS?{' '}
                <Link to="/get-started" style={{ color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
                  Set up your organisation
                </Link>
              </div>
            </div>

            {/* Right Panel: Instant Demo Logins */}
            <div style={{ 
              background: 'var(--slate-50)', 
              borderLeft: '1px solid var(--border)', 
              padding: '40px 36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--teal)' }}>auto_awesome</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instant Access</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--navy)' }}>Explore with Demo Accounts</h2>
                <p style={{ fontSize: 12, color: 'var(--slate-500)', lineHeight: 1.5, marginTop: 4 }}>
                  No password entry required. Click below to experience HIRIS from different perspectives.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {DEMO_ACCOUNTS.map(account => {
                  const isThisBusy = busyDemoEmail === account.email
                  const isAnyBusy = !!busyDemoEmail
                  return (
                    <button
                      key={account.email}
                      onClick={() => handleQuickDemoLogin(account)}
                      disabled={busy}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        background: 'var(--surface)',
                        textAlign: 'left',
                        cursor: busy ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        opacity: isAnyBusy && !isThisBusy ? 0.6 : 1,
                        outline: 'none',
                      }}
                      onMouseEnter={e => {
                        if (!busy) {
                          e.currentTarget.style.borderColor = account.color;
                          e.currentTarget.style.transform = 'translateX(2px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!busy) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <div style={{ 
                        width: 36, height: 36, borderRadius: 8, 
                        background: account.badgeBg, display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span className="material-symbols-outlined" style={{ color: account.color, fontSize: 18 }}>
                          {account.icon}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{account.label}</span>
                          {isThisBusy && (
                            <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5, marginLeft: 'auto' }} />
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)', lineHeight: 1.3, marginTop: 2 }}>
                          {account.shortDesc}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 700,
  color: 'var(--slate-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
}
