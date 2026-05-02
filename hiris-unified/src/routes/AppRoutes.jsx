import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const HomePage = lazy(() => import('../pages/landing/HomePage'))
const PricingPage = lazy(() => import('../pages/landing/PricingPage'))
const OrgSignup = lazy(() => import('../pages/onboarding/OrgSignup'))
const RoleManagement = lazy(() => import('../pages/settings/roles/RoleManagement'))

const HiringDashboard = lazy(() => import('../pages/portals/hiring/Dashboard'))
const HiringRequests = lazy(() => import('../pages/portals/hiring/Requests'))
const HiringCandidates = lazy(() => import('../pages/portals/hiring/Candidates'))
const HiringJobs = lazy(() => import('../pages/portals/hiring/Jobs'))
const HiringSchedule = lazy(() => import('../pages/portals/hiring/Schedule'))

const FacultyDashboard = lazy(() => import('../pages/portals/faculty/Dashboard'))
const FacultyRequests = lazy(() => import('../pages/portals/faculty/Requests'))
const FacultyJDReviews = lazy(() => import('../pages/portals/faculty/JDReviews'))
const FacultyCandidates = lazy(() => import('../pages/portals/faculty/Candidates'))
const FacultyInterviews = lazy(() => import('../pages/portals/faculty/Interviews'))

const CHRODashboard = lazy(() => import('../pages/portals/chro/Dashboard'))
const CHROOverview = lazy(() => import('../pages/portals/chro/Overview'))
const CHROPolicies = lazy(() => import('../pages/portals/chro/Policies'))
const CHROTeam = lazy(() => import('../pages/portals/chro/Team'))
const CHROAnalytics = lazy(() => import('../pages/portals/chro/Analytics'))
const CHROInterviews = lazy(() => import('../pages/portals/chro/Interviews'))

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" />
    </div>
  )
}

function DashboardRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingFallback />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.portal}`} replace />
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OrgSignup />} />
        <Route path="/signup" element={<OrgSignup />} />

        <Route element={<ProtectedRoute allowedPortal="hiring" />}>
          <Route path="/hiring" element={<HiringDashboard />} />
          <Route path="/hiring/requests" element={<HiringRequests />} />
          <Route path="/hiring/candidates" element={<HiringCandidates />} />
          <Route path="/hiring/jobs" element={<HiringJobs />} />
          <Route path="/hiring/schedule" element={<HiringSchedule />} />
        </Route>

        <Route element={<ProtectedRoute allowedPortal="faculty" />}>
          <Route path="/faculty" element={<FacultyDashboard />} />
          <Route path="/faculty/requests" element={<FacultyRequests />} />
          <Route path="/faculty/jd-reviews" element={<FacultyJDReviews />} />
          <Route path="/faculty/candidates" element={<FacultyCandidates />} />
          <Route path="/faculty/interviews" element={<FacultyInterviews />} />
        </Route>

        <Route element={<ProtectedRoute allowedPortal="chro" />}>
          <Route path="/chro" element={<CHRODashboard />} />
          <Route path="/chro/overview" element={<CHROOverview />} />
          <Route path="/chro/policies" element={<CHROPolicies />} />
          <Route path="/chro/team" element={<CHROTeam />} />
          <Route path="/chro/analytics" element={<CHROAnalytics />} />
          <Route path="/chro/interviews" element={<CHROInterviews />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/settings/roles" element={<RoleManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
