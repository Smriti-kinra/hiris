import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * allowedRoles: e.g. ['CHRO'] | ['Hiring Manager'] | ['Faculty']
 * If no roles specified, any logged-in user passes.
 */
export default function ProtectedRoute({ allowedPortal }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)'
      }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedPortal && user.portal !== allowedPortal) {
    // Redirect to their correct portal
    return <Navigate to={`/${user.portal}`} replace />
  }

  return <Outlet />
}
