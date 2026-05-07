/**
 * FacultyRoutes.jsx — Faculty portal isolated route tree.
 * Only includes pages a faculty member can access.
 * CHRO, Hiring Manager, and Admin routes are completely absent
 * from this bundle, reducing bundle size and eliminating route conflicts.
 */
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PortalGuard from '../../components/PortalGuard'
import ProtectedRoute from '../../components/ProtectedRoute'

const LoginPage              = lazy(() => import('../../pages/auth/LoginPage'))
const FacultyDashboard       = lazy(() => import('../../pages/portals/faculty/Dashboard'))
const FacultyRequests        = lazy(() => import('../../pages/portals/faculty/Requests'))
const FacultyJDReviews       = lazy(() => import('../../pages/portals/faculty/JDReviews'))
const FacultyInterviews      = lazy(() => import('../../pages/portals/faculty/Interviews'))
const TechnicalInterviewRoom = lazy(() => import('../../pages/portals/shared/TechnicalInterviewRoom'))
const InterviewSummary       = lazy(() => import('../../pages/portals/shared/InterviewSummary'))
const JobPostingBuilder      = lazy(() => import('../../pages/portals/hiring/JobPostingBuilder'))

const Loading = () => <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

export default function FacultyRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Faculty-guarded routes — redirects non-faculty to their correct portal */}
        <Route element={<PortalGuard portalId="faculty" />}>
          <Route element={<ProtectedRoute requiredAny={['can_request_jobs','can_review_jd','can_conduct_interview']} />}>
            <Route path="/faculty"                   element={<FacultyDashboard />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_requests" />}>
            <Route path="/faculty/requests"          element={<FacultyRequests />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_review_jd" />}>
            <Route path="/faculty/jd-reviews"        element={<FacultyJDReviews />} />
            {/* Faculty JD builder is read-only review mode — navigated to from JD Reviews */}
            <Route path="/faculty/jd-builder"        element={<JobPostingBuilder />} />
          </Route>
          <Route element={<ProtectedRoute requiredAny={['can_view_interviews','can_conduct_interview']} />}>
            <Route path="/faculty/interviews"        element={<FacultyInterviews />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_conduct_interview" />}>
            <Route path="/interview-room/technical/:sessionId"  element={<TechnicalInterviewRoom />} />
          </Route>
          <Route element={<ProtectedRoute requiredAny={['can_view_interviews','can_conduct_interview']} />}>
            <Route path="/interview-room/summary/:sessionId"    element={<InterviewSummary />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="/" element={<Navigate to="/faculty" replace />} />
        <Route path="*" element={<Navigate to="/faculty" replace />} />
      </Routes>
    </Suspense>
  )
}
