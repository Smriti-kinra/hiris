import React from 'react'
import ReactDOM from 'react-dom/client'
import '../../index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import { ToastProvider } from '../../context/ToastContext'
import ErrorBoundary from '../../components/ErrorBoundary'
import CandidateRoutes from './CandidateRoutes'
import { Analytics } from '@vercel/analytics/react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <CandidateRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
      <Analytics />
    </ErrorBoundary>
  </React.StrictMode>
)
