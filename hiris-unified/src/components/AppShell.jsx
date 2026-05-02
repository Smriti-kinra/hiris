import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ── Icon helpers (inline SVGs, no dep needed) ── */
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  home:       'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  users:      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  briefcase:  'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
  chart:      'M18 20V10 M12 20V4 M6 20v-6',
  settings:   'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
  file:       'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  logout:     'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
  sun:        'M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 5a7 7 0 000 14A7 7 0 0012 5z',
  moon:       'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  mail:       'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  star:       'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  calendar:   'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  policy:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  team:       'M12 4.5C12 6.43 10.43 8 8.5 8S5 6.43 5 4.5 6.57 1 8.5 1 12 2.57 12 4.5z M16 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M0 18v-1.5C0 14.57 1.79 13 4 13h9c2.21 0 4 1.57 4 3.5V18 M19 13c2.21 0 4 1.57 4 3.5V18',
}

/* ── Portal-specific nav configs ── */
const navConfigs = {
  hiring: [
    { label: 'Overview', to: '/hiring', icon: 'home', end: true },
    { label: 'Hiring Requests', to: '/hiring/requests', icon: 'briefcase' },
    { label: 'Job Postings', to: '/hiring/jobs', icon: 'file' },
    { label: 'Candidates', to: '/hiring/candidates', icon: 'users' },
    { label: 'Schedule', to: '/hiring/schedule', icon: 'calendar' },
  ],
  faculty: [
    { label: 'Overview', to: '/faculty', icon: 'home', end: true },
    { label: 'My Requests', to: '/faculty/requests', icon: 'briefcase' },
    { label: 'JD Reviews', to: '/faculty/jd-reviews', icon: 'file' },
    { label: 'Candidates', to: '/faculty/candidates', icon: 'users' },
    { label: 'Interviews', to: '/faculty/interviews', icon: 'calendar' },
  ],
  chro: [
    { label: 'Overview', to: '/chro', icon: 'home', end: true },
    { label: 'Hiring Overview', to: '/chro/overview', icon: 'chart' },
    { label: 'Policies', to: '/chro/policies', icon: 'policy' },
    { label: 'Team', to: '/chro/team', icon: 'team' },
    { label: 'Analytics', to: '/chro/analytics', icon: 'star' },
    { label: 'Final Interviews', to: '/chro/interviews', icon: 'calendar' },
    { label: 'Role Management', to: '/settings/roles', icon: 'settings' },
  ],
}

const portalLabels = {
  hiring: { label: 'Hiring Manager', color: '#3B82F6' },
  faculty: { label: 'Faculty', color: '#8B5CF6' },
  chro: { label: 'CHRO', color: '#10B981' },
}

function SunIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export default function AppShell({ portal, pageTitle, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()
  const nav = navConfigs[portal] || []
  const pl = portalLabels[portal] || {}

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
    : '??'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      {/* ── Mobile Overlay ── */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">H</div>
          <div>
            <div className="sidebar-logo-text">HIRIS</div>
            <div className="sidebar-logo-sub">{pl.label}</div>
          </div>
          <button 
            className="mobile-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon d={icons[item.icon]} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item" onClick={handleLogout} style={{ color: '#EF4444' }}>
            <Icon d={icons.logout} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="hamburger-btn" 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              {pageTitle}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar">{initials}</div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.title}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="page-body">
          {children}
        </div>
      </div>
    </div>
  )
}
