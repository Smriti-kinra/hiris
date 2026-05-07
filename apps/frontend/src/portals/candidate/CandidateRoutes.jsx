/**
 * CandidateRoutes.jsx — Public Candidate portal route tree.
 * Serves the job application portal. No auth required.
 */
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const CandidateJobPortal = lazy(() => import('../../pages/public/CandidateJobPortal'))

const Loading = () => <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

export default function CandidateRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/jobs/apply/:token" element={<CandidateJobPortal />} />
        <Route path="/"  element={<Navigate to="/jobs/apply/demo" replace />} />
        <Route path="*"  element={<Navigate to="/jobs/apply/demo" replace />} />
      </Routes>
    </Suspense>
  )
}
