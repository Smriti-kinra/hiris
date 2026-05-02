/**
 * config/sentry.js
 *
 * Initialises Sentry error monitoring.
 * This module is require()-d at the TOP of server.js, before any other imports,
 * so that Sentry can instrument Express, pg, and other modules automatically.
 *
 * Usage in server.js:
 *   // Must be the very first require — before express, pg, etc.
 *   const { Sentry, sentryErrorHandler } = require('./config/sentry')
 *
 * Environment variables:
 *   SENTRY_DSN        — Sentry project DSN (required for Sentry to activate)
 *   SENTRY_ENVIRONMENT — e.g. "production", "staging" (defaults to NODE_ENV)
 *   SENTRY_RELEASE    — optional release/version tag for source maps
 *
 * If SENTRY_DSN is absent the module exports no-op stubs so the rest of the
 * application works identically without Sentry installed.
 */

let Sentry
let sentryErrorHandler

const dsn = process.env.SENTRY_DSN

if (dsn) {
  try {
    Sentry = require('@sentry/node')
    const { nodeProfilingIntegration } = require('@sentry/profiling-node')

    Sentry.init({
      dsn,
      environment:       process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release:           process.env.SENTRY_RELEASE,
      tracesSampleRate:  parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),

      integrations: [
        // Auto-instruments http, express, pg
        ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
        nodeProfilingIntegration(),
      ],

      // Strip PII from breadcrumbs / events
      beforeSend(event) {
        if (event.request?.cookies) {
          event.request.cookies = '[Filtered]'
        }
        return event
      },
    })

    // Express error handler middleware (must be registered AFTER all routes)
    sentryErrorHandler = Sentry.Handlers.errorHandler()

    console.log(`[sentry] Initialised (env=${process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV})`)
  } catch (err) {
    console.warn('[sentry] Failed to initialise — running without error monitoring:', err.message)
    Sentry = null
    sentryErrorHandler = null
  }
} else {
  // No DSN configured — provide harmless no-ops so call sites don't need
  // to guard against undefined.
  Sentry = {
    captureException: () => {},
    captureMessage:   () => {},
    setUser:          () => {},
    addBreadcrumb:    () => {},
    Handlers: {
      requestHandler: () => (_req, _res, next) => next(),
      errorHandler:   () => (_err, _req, _res, next) => next(_err),
    },
  }
  sentryErrorHandler = (_err, _req, _res, next) => next(_err)

  if (process.env.NODE_ENV === 'production') {
    console.warn('[sentry] SENTRY_DSN not set — error monitoring is DISABLED in production.')
  }
}

module.exports = { Sentry, sentryErrorHandler }
