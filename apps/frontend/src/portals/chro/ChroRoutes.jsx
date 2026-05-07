/**
 * ChroRoutes.jsx — CHRO portal isolated route tree.
 * Only includes CHRO-relevant pages. Faculty and Hiring routes are absent.
 */
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PortalGuard from '../../components/PortalGuard'
import ProtectedRoute from '../../components/ProtectedRoute'

const LoginPage        = lazy(() => import('../../pages/auth/LoginPage'))
const CHRODashboard    = lazy(() => import('../../pages/portals/chro/Dashboard'))
const CHROCandidates   = lazy(() => import('../../pages/portals/chro/Candidates'))
const CHROInterviews   = lazy(() => import('../../pages/portals/chro/Interviews'))
const CHROPolicies     = lazy(() => import('../../pages/portals/chro/Policies'))
const CHROTeam         = lazy(() => import('../../pages/portals/chro/Team'))
const CHROAnalytics    = lazy(() => import('../../pages/portals/chro/Analytics'))
const CandidateProfile = lazy(() => import('../../pages/portals/shared/CandidateProfile'))
const BehavioralRoom   = lazy(() => import('../../pages/portals/shared/BehavioralInterviewRoom'))
const InterviewSummary = lazy(() => import('../../pages/portals/shared/InterviewSummary'))
const RoleManagement   = lazy(() => import('../../pages/settings/roles/RoleManagement'))

const Loading = () => <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

export default function ChroRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PortalGuard portalId="chro" />}>
          <Route element={<ProtectedRoute requiredPermission="can_view_analytics" />}>
            <Route path="/chro"                              element={<CHRODashboard />} />
            <Route path="/chro/overview"                     element={<Navigate to="/chro" replace />} />
            <Route path="/chro/analytics"                    element={<CHROAnalytics />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_candidates" />}>
            <Route path="/chro/candidates"                   element={<CHROCandidates />} />
            <Route path="/chro/candidates/:id"               element={<CandidateProfile />} />
          </Route>
          <Route element={<ProtectedRoute requiredAny={['can_view_interviews','can_conduct_interview']} />}>
            <Route path="/chro/interviews"                   element={<CHROInterviews />} />
            <Route path="/interview-room/behavioral/:sessionId" element={<BehavioralRoom />} />
            <Route path="/interview-room/summary/:sessionId"    element={<InterviewSummary />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_policies" />}>
            <Route path="/chro/policies"                     element={<CHROPolicies />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_manage_team" />}>
            <Route path="/chro/team"                         element={<CHROTeam />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_manage_roles" />}>
            <Route path="/settings/roles"                    element={<RoleManagement />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/chro" replace />} />
        <Route path="*" element={<Navigate to="/chro" replace />} />
      </Routes>
    </Suspense>
  )
}
