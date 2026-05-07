/**
 * PortalGuard.jsx
 *
 * Enforces that the logged-in user belongs to the correct portal.
 * If a faculty user navigates to the CHRO portal URL they are redirected
 * to their own portal rather than seeing a permission error.
 *
 * Accepted portalId values: 'faculty' | 'hiring' | 'chro' | 'recruiter' | 'candidate'
 *
 * Portal membership is determined by user.portal which the backend sets
 * from the role's landing_portal field.
 */
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Maps portal key → expected user.portal values
const PORTAL_ROLES = {
  faculty:   ['faculty'],
  hiring:    ['hiring', 'hiring_manager'],
  chro:      ['chro'],
  recruiter: ['recruiter', 'hiring'],   // recruiters use the hiring portal pages
  candidate: [],                         // public portal, no auth required
}

// Maps user.portal → correct portal dev URL
const PORTAL_URLS = {
  faculty:         import.meta.env.VITE_PORTAL_URL_FACULTY   || 'http://localhost:5174',
  hiring:          import.meta.env.VITE_PORTAL_URL_HIRING    || 'http://localhost:5175',
  hiring_manager:  import.meta.env.VITE_PORTAL_URL_HIRING    || 'http://localhost:5175',
  chro:            import.meta.env.VITE_PORTAL_URL_CHRO      || 'http://localhost:5176',
  recruiter:       import.meta.env.VITE_PORTAL_URL_RECRUITER || 'http://localhost:5177',
}

/**
 * Returns the correct portal URL for a given user.
 * Admins are allowed through on any portal.
 */
export function getPortalUrl(user) {
  if (!user) return import.meta.env.VITE_PORTAL_URL_LANDING || 'http://localhost:5173'
  return PORTAL_URLS[user.portal] || import.meta.env.VITE_PORTAL_URL_LANDING || 'http://localhost:5173'
}

export default function PortalGuard({ portalId }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div className="spinner" />
      </div>
    )
  }

  // Not authenticated → go to login on this portal (each portal has its own /login)
  if (!user) return <Navigate to="/login" replace />

  // Admin bypass — admins can access any portal
  if (user.permissions?.is_admin) return <Outlet />

  // Candidate portal is public — no role check needed
  if (portalId === 'candidate') return <Outlet />

  const allowedPortals = PORTAL_ROLES[portalId] || []
  const userBelongsHere = allowedPortals.includes(user.portal)

  if (!userBelongsHere) {
    // Cross-portal violation: redirect to their correct portal
    const correctUrl = getPortalUrl(user)
    const currentOrigin = window.location.origin

    if (correctUrl !== currentOrigin) {
      // Different port → hard navigate to their portal's home
      window.location.href = correctUrl
      return null
    } else {
      // Same port (shouldn't happen in prod) → send to their home path
      return <Navigate to={user.home_path || '/login'} replace />
    }
  }

  return <Outlet />
}
