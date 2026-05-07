/**
 * components/ErrorBoundary.jsx
 *
 * Phase 4: Wires componentDidCatch to the @sentry/react SDK.
 * Falls back gracefully when Sentry is not installed — no runtime crash.
 *
 * SETUP:
 *   1. npm install @sentry/react in hiris-unified
 *   2. Add to main.jsx (before rendering):
 *        import * as Sentry from '@sentry/react'
 *        Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })
 *   3. This component automatically picks up the initialised Sentry instance.
 */

import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, eventId: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Report to Sentry if available
    try {
      // Dynamic import avoids a hard crash if @sentry/react is not installed
      import('@sentry/react').then(({ captureException, withScope }) => {
        withScope((scope) => {
          scope.setExtras({ componentStack: errorInfo.componentStack })
          const eventId = captureException(error)
          this.setState({ eventId })
        })
      }).catch(() => {
        // Sentry not available — log to console instead
        console.error('[ErrorBoundary] Unhandled error:', error, errorInfo)
      })
    } catch {
      console.error('[ErrorBoundary] Unhandled error:', error, errorInfo)
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, eventId: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)',
        fontFamily: 'var(--font-body, system-ui)',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 480, padding: '48px 32px',
          background: 'var(--bg-secondary)', borderRadius: 16,
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            An unexpected error occurred. The engineering team has been notified
            automatically.
            {this.state.eventId && (
              <> Error reference: <code style={{ fontSize: 11 }}>{this.state.eventId}</code></>
            )}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: 14,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                background: 'transparent', color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
