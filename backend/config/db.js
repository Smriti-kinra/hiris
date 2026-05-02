/**
 * config/db.js — PostgreSQL connection pool
 *
 * Changes vs original:
 *   - Explicit pool sizing and timeout config (Phase 4 perf)
 *   - Slow-query logging at WARN level (configurable threshold)
 *   - Connection-error reporting to Sentry when DSN is configured
 */

const { Pool } = require('pg')

// Queries taking longer than this (ms) will be logged as warnings.
const SLOW_QUERY_WARN_MS = parseInt(process.env.SLOW_QUERY_WARN_MS || '500', 10)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max:                      parseInt(process.env.DB_POOL_MAX           || '10',   10),
  idleTimeoutMillis:        parseInt(process.env.DB_IDLE_TIMEOUT_MS    || '30000', 10),
  connectionTimeoutMillis:  parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000',  10),
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message)
  try {
    const Sentry = require('@sentry/node')
    Sentry.captureException(err, { tags: { layer: 'db', event: 'pool_error' } })
  } catch (_) {}
})

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[db] New client connected to pool')
  }
})

async function query(text, params) {
  const start = Date.now()
  let res

  try {
    res = await pool.query(text, params)
  } catch (err) {
    const ms = Date.now() - start
    console.error(`[db] QUERY ERROR ${ms}ms: ${err.message} | sql="${text.slice(0,120).replace(/\s+/g,' ')}"`)
    try {
      const Sentry = require('@sentry/node')
      Sentry.captureException(err, { tags: { layer:'db', event:'query_error' }, extra: { sql: text.slice(0,500), params, durationMs: ms } })
    } catch (_) {}
    throw err
  }

  const ms = Date.now() - start

  if (ms >= SLOW_QUERY_WARN_MS) {
    console.warn(`[db] SLOW QUERY ${ms}ms | rows=${res.rowCount} | sql="${text.slice(0,120).replace(/\s+/g,' ')}"`)
    try {
      const Sentry = require('@sentry/node')
      Sentry.captureMessage(`Slow query detected (${ms}ms)`, {
        level: 'warning',
        tags:  { layer: 'db', event: 'slow_query' },
        extra: { sql: text.slice(0,500), durationMs: ms, rowCount: res.rowCount },
      })
    } catch (_) {}
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[db] ${ms}ms | rows=${res.rowCount} | "${text.slice(0,80).replace(/\s+/g,' ')}"`)
  }

  return res
}

module.exports = { query, pool }
