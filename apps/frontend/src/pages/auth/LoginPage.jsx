import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import { useAuth } from '../../context/AuthContext'
import hirisLogo from '../../assets/hiris-logo.svg'

// Portal URL map — reads from env (each portal sets these via its .env.* file)
// Falls back to same-origin single-app paths for backward compat.
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
    // Multi-portal mode: return the full URL for hard navigation
    return portalUrl + (user.home_path || '')
  }
  // Single-app fallback: relative path
  return user.home_path || '/dashboard'
}

const DEMO_ACCOUNTS = [
  { email: 'smriti.kinra@hiris.demo', role: 'CHRO', label: 'Smriti Kinra' },
  { email: 'sartajdeep.singh@hiris.demo', role: 'Hiring Manager', label: 'Sartajdeep Singh' },
  { email: 'gracy.tanna@hiris.demo', role: 'Faculty Portal', label: 'Gracy Tanna' },
]

const DEMO_PASSWORD = 'hiris2026'



export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
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
        // Cross-portal hard redirect (multi-portal mode)
        window.location.href = dest
      } else {
        navigate(dest, { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return setError('Email is required.')
    if (!password.trim()) return setError('Password is required.')
    submitLogin(email, password)
  }

  function quickLogin(account) {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    submitLogin(account.email, DEMO_PASSWORD)
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

      <main style={{ paddingTop: 110, paddingBottom: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: 430, padding: '0 24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '36px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ marginBottom: 28 }}>
              <div className="auth-logo-wrap">
                <img className="auth-logo-img" src={hirisLogo} alt="HIRIS" />
              </div>
              <h1 style={{ fontSize: '1.4rem', marginBottom: 6 }}>Sign in to HIRIS</h1>
              <p style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6 }}>
                Use your organisation account to continue to your secure dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="hiris-email" style={labelStyle}>Work Email</label>
                <input
                  id="hiris-email"
                  type="email"
                  value={email}
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
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Password"
                    className="hiris-input"
                    style={{ paddingRight: 54, borderColor: error ? '#EF4444' : undefined }}
                  />
                  <button
                    type="button"
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

              {error && <div style={{ fontSize: 12, color: '#EF4444', lineHeight: 1.5 }}>{error}</div>}

              <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Signing in...' : 'Continue'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--slate-500)' }}>
              New to HIRIS?{' '}
              <Link to="/onboarding" style={{ color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
                Set up your organisation
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--slate-500)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: 'var(--slate-700)' }}>Demo accounts</div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11 }}>pw: {DEMO_PASSWORD}</span>
            </div>

            {DEMO_ACCOUNTS.map(account => (
              <div key={account.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0' }}>
                <button
                  type="button"
                  onClick={() => setEmail(account.email)}
                  style={{
                    display: 'block', flex: 1, textAlign: 'left', background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--slate-500)',
                  }}
                >
                  {account.label} - {account.role}
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin(account)}
                  disabled={busy}
                  style={{
                    border: '1px solid var(--border)', background: 'var(--slate-50)',
                    color: 'var(--teal)', fontSize: 11, fontWeight: 700,
                    padding: '4px 8px', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Quick Login
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--slate-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
}
