import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function hasPermission(user, key) {
  return !!(user?.permissions?.[key] || user?.permissions?.is_admin)
}

export default function ProtectedRoute({ requiredPermission, requiredAny = [] }) {
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

  if (!user) {
    const landingUrl = import.meta.env.VITE_PORTAL_URL_LANDING || 'http://localhost:5173'
    if (window.location.origin !== landingUrl) {
      window.location.href = landingUrl + '/login'
      return null
    }
    return <Navigate to="/login" replace />
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to={user.home_path || '/dashboard'} replace />
  }

  if (requiredAny.length > 0 && !requiredAny.some(key => hasPermission(user, key))) {
    return <Navigate to={user.home_path || '/dashboard'} replace />
  }

  return <Outlet />
}
