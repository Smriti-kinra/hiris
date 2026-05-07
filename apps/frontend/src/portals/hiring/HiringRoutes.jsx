/**
 * HiringRoutes.jsx — Hiring Manager portal isolated route tree.
 * Only includes pages relevant to hiring managers.
 * Faculty and CHRO routes are completely absent from this bundle.
 */
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PortalGuard from '../../components/PortalGuard'
import ProtectedRoute from '../../components/ProtectedRoute'

const HiringDashboard   = lazy(() => import('../../pages/portals/hiring/Dashboard'))
const HiringRequests    = lazy(() => import('../../pages/portals/hiring/Requests'))
const HiringCandidates  = lazy(() => import('../../pages/portals/hiring/Candidates'))
const HiringJobs        = lazy(() => import('../../pages/portals/hiring/Jobs'))
const HiringSchedule    = lazy(() => import('../../pages/portals/hiring/Schedule'))
const JobPostingBuilder = lazy(() => import('../../pages/portals/hiring/JobPostingBuilder'))
const PostedJobs        = lazy(() => import('../../pages/portals/hiring/PostedJobs'))
const JobApplicants     = lazy(() => import('../../pages/portals/hiring/JobApplicants'))
const CandidateProfile  = lazy(() => import('../../pages/portals/shared/CandidateProfile'))
const BehavioralRoom    = lazy(() => import('../../pages/portals/shared/BehavioralInterviewRoom'))
const InterviewSummary  = lazy(() => import('../../pages/portals/shared/InterviewSummary'))

const Loading = () => <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

export default function HiringRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>

        <Route element={<PortalGuard portalId="hiring" />}>
          <Route element={<ProtectedRoute requiredAny={['can_view_requests','can_view_jobs','can_view_candidates']} />}>
            <Route path="/hiring"                        element={<HiringDashboard />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_requests" />}>
            <Route path="/hiring/requests"               element={<HiringRequests />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_candidates" />}>
            <Route path="/hiring/candidates"             element={<HiringCandidates />} />
            <Route path="/hiring/candidates/:id"         element={<CandidateProfile />} />
          </Route>
          <Route element={<ProtectedRoute requiredAny={['can_view_jobs','can_build_jd']} />}>
            <Route path="/hiring/jobs"                   element={<HiringJobs />} />
            <Route path="/hiring/job-builder"            element={<JobPostingBuilder />} />
          </Route>
          <Route element={<ProtectedRoute requiredPermission="can_view_jobs" />}>
            <Route path="/hiring/posted-jobs"            element={<PostedJobs />} />
            <Route path="/hiring/posted-jobs/:jobId"     element={<JobApplicants />} />
          </Route>
          <Route element={<ProtectedRoute requiredAny={['can_view_interviews','can_conduct_interview']} />}>
            <Route path="/hiring/schedule"               element={<HiringSchedule />} />
            <Route path="/interview-room/behavioral/:sessionId" element={<BehavioralRoom />} />
            <Route path="/interview-room/summary/:sessionId"    element={<InterviewSummary />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/hiring" replace />} />
        <Route path="*" element={<Navigate to="/hiring" replace />} />
      </Routes>
    </Suspense>
  )
}
