import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const HomePage = lazy(() => import('../pages/landing/HomePage'))
const PricingPage = lazy(() => import('../pages/landing/PricingPage'))
const OrgSignup = lazy(() => import('../pages/onboarding/OrgSignup'))
const RoleManagement = lazy(() => import('../pages/settings/roles/RoleManagement'))

const CandidateJobPortal = lazy(() => import('../pages/public/CandidateJobPortal'))

const HiringDashboard = lazy(() => import('../pages/portals/hiring/Dashboard'))
const HiringRequests = lazy(() => import('../pages/portals/hiring/Requests'))
const HiringCandidates = lazy(() => import('../pages/portals/hiring/Candidates'))
const HiringJobs = lazy(() => import('../pages/portals/hiring/Jobs'))
const HiringSchedule = lazy(() => import('../pages/portals/hiring/Schedule'))
const JobPostingBuilder = lazy(() => import('../pages/portals/hiring/JobPostingBuilder'))
const PostedJobs = lazy(() => import('../pages/portals/hiring/PostedJobs'))
const JobApplicants = lazy(() => import('../pages/portals/hiring/JobApplicants'))
const CandidateProfile = lazy(() => import('../pages/portals/shared/CandidateProfile'))
const TechnicalInterviewRoom = lazy(() => import('../pages/portals/shared/TechnicalInterviewRoom'))
const BehavioralInterviewRoom = lazy(() => import('../pages/portals/shared/BehavioralInterviewRoom'))
const InterviewSummary = lazy(() => import('../pages/portals/shared/InterviewSummary'))

const FacultyDashboard = lazy(() => import('../pages/portals/faculty/Dashboard'))
const FacultyRequests = lazy(() => import('../pages/portals/faculty/Requests'))
const FacultyJDReviews = lazy(() => import('../pages/portals/faculty/JDReviews'))
const FacultyCandidates = lazy(() => import('../pages/portals/faculty/Candidates'))
const FacultyInterviews = lazy(() => import('../pages/portals/faculty/Interviews'))

const CHRODashboard = lazy(() => import('../pages/portals/chro/Dashboard'))
const CHROPolicies = lazy(() => import('../pages/portals/chro/Policies'))
const CHROTeam = lazy(() => import('../pages/portals/chro/Team'))
const CHROAnalytics = lazy(() => import('../pages/portals/chro/Analytics'))
const CHROCandidates = lazy(() => import('../pages/portals/chro/Candidates'))
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
  const perms = user.permissions || {}
  const can = key => !!(perms[key] || perms.is_admin)
  const firstAllowed =
    user.home_path ||
    (can('can_view_analytics') ? '/chro' : null) ||
    (can('can_view_requests') || can('can_view_jobs') || can('can_view_candidates') ? '/hiring' : null) ||
    (can('can_request_jobs') || can('can_review_jd') || can('can_conduct_interview') ? '/faculty' : null) ||
    '/login'
  return <Navigate to={firstAllowed} replace />
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
        <Route path="/jobs/apply/:token" element={<CandidateJobPortal />} />

        <Route element={<ProtectedRoute requiredAny={['can_view_requests', 'can_view_jobs', 'can_view_candidates', 'can_view_analytics']} />}>
          <Route path="/hiring" element={<HiringDashboard />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_requests" />}>
          <Route path="/hiring/requests" element={<HiringRequests />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_candidates" />}>
          <Route path="/hiring/candidates" element={<HiringCandidates />} />
          <Route path="/hiring/candidates/:id" element={<CandidateProfile />} />
        </Route>
        <Route element={<ProtectedRoute requiredAny={['can_view_jobs', 'can_build_jd', 'can_review_jd']} />}>
          <Route path="/hiring/jobs" element={<HiringJobs />} />
        </Route>
        <Route element={<ProtectedRoute requiredAny={['can_build_jd', 'can_review_jd']} />}>
          <Route path="/hiring/job-builder" element={<JobPostingBuilder />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_jobs" />}>
          <Route path="/hiring/posted-jobs" element={<PostedJobs />} />
          <Route path="/hiring/posted-jobs/:jobId" element={<JobApplicants />} />
        </Route>
        <Route element={<ProtectedRoute requiredAny={['can_view_interviews', 'can_conduct_interview']} />}>
          <Route path="/hiring/schedule" element={<HiringSchedule />} />
        </Route>

        <Route element={<ProtectedRoute requiredAny={['can_request_jobs', 'can_review_jd', 'can_conduct_interview']} />}>
          <Route path="/faculty" element={<FacultyDashboard />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_requests" />}>
          <Route path="/faculty/requests" element={<FacultyRequests />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_review_jd" />}>
          <Route path="/faculty/jd-reviews" element={<FacultyJDReviews />} />
          <Route path="/faculty/jd-builder" element={<JobPostingBuilder />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_candidates" />}>
          <Route path="/faculty/candidates" element={<FacultyCandidates />} />
          <Route path="/faculty/candidates/:id" element={<CandidateProfile />} />
        </Route>
        <Route element={<ProtectedRoute requiredAny={['can_view_interviews', 'can_conduct_interview']} />}>
          <Route path="/faculty/interviews" element={<FacultyInterviews />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="can_view_analytics" />}>
          <Route path="/chro" element={<CHRODashboard />} />
          <Route path="/chro/overview" element={<Navigate to="/chro" replace />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_policies" />}>
          <Route path="/chro/policies" element={<CHROPolicies />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_manage_team" />}>
          <Route path="/chro/team" element={<CHROTeam />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_analytics" />}>
          <Route path="/chro/analytics" element={<CHROAnalytics />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_view_candidates" />}>
          <Route path="/chro/candidates" element={<CHROCandidates />} />
          <Route path="/chro/candidates/:id" element={<CandidateProfile />} />
        </Route>
        <Route element={<ProtectedRoute requiredAny={['can_view_interviews', 'can_conduct_interview']} />}>
          <Route path="/chro/interviews" element={<CHROInterviews />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_manage_roles" />}>
          <Route path="/settings/roles" element={<RoleManagement />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="can_conduct_interview" />}>
          <Route path="/interview-room/technical/:sessionId" element={<TechnicalInterviewRoom />} />
          <Route path="/interview-room/behavioral/:sessionId" element={<BehavioralInterviewRoom />} />
        </Route>
        <Route element={<ProtectedRoute requiredAny={['can_view_interviews', 'can_conduct_interview']} />}>
          <Route path="/interview-room/summary/:sessionId" element={<InterviewSummary />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
