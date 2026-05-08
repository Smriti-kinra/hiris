/**
 * RecruiterRoutes.jsx — Recruiter portal isolated route tree.
 * Recruiters share the Hiring portal pages but with recruiter-scoped permissions.
 * Faculty, CHRO, and Admin routes are excluded.
 */
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PortalGuard from '../../components/PortalGuard'
import ProtectedRoute from '../../components/ProtectedRoute'

const HiringDashboard  = lazy(() => import('../../pages/portals/hiring/Dashboard'))
const HiringCandidates = lazy(() => import('../../pages/portals/hiring/Candidates'))
const HiringRequests   = lazy(() => import('../../pages/portals/hiring/Requests'))
const HiringSchedule   = lazy(() => import('../../pages/portals/hiring/Schedule'))
const PostedJobs       = lazy(() => import('../../pages/portals/hiring/PostedJobs'))
const JobApplicants    = lazy(() => import('../../pages/portals/hiring/JobApplicants'))
const CandidateProfile = lazy(() => import('../../pages/portals/shared/CandidateProfile'))
const InterviewSummary = lazy(() => import('../../pages/portals/shared/InterviewSummary'))

const Loading = () => <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

export default function RecruiterRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>

        {/* Recruiter role maps to 'hiring' portal pages */}
        <Route element={<PortalGuard portalId="recruiter" />}>
          <Route element={<ProtectedRoute requiredAny={['can_view_candidates','can_view_requests']} />}>
            <Route path="/hiring"                    element={<HiringDashboard />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_requests" />}>
            <Route path="/hiring/requests"           element={<HiringRequests />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_candidates" />}>
            <Route path="/hiring/candidates"         element={<HiringCandidates />} />
            <Route path="/hiring/candidates/:id"     element={<CandidateProfile />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_jobs" />}>
            <Route path="/hiring/posted-jobs"        element={<PostedJobs />} />
            <Route path="/hiring/posted-jobs/:jobId" element={<JobApplicants />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_interviews" />}>
            <Route path="/hiring/schedule"           element={<HiringSchedule />} />
            <Route path="/interview-room/summary/:sessionId" element={<InterviewSummary />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/hiring" replace />} />
        <Route path="*" element={<Navigate to="/hiring" replace />} />
      </Routes>
    </Suspense>
  )
}
