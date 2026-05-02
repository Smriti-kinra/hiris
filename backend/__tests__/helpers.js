/**
 * __tests__/helpers.js
 *
 * Shared test utilities for HIRIS integration tests.
 *
 * Usage:
 *   const { buildApp, seedTestOrg, teardownTestOrg, db } = require('./helpers')
 *
 * All helpers talk to the REAL database (TEST_DATABASE_URL or DATABASE_URL).
 * Each test suite should call seedTestOrg() before its tests and
 * teardownTestOrg() in afterAll() so suites remain independent.
 */

require('dotenv').config()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { Pool } = require('pg')

// ── Dedicated test pool ───────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  max: 5,
})

async function dbQuery(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

// ── App factory ───────────────────────────────────────────────────────────────
// Re-require server.js is not safe because it calls listen().
// Instead we export a minimal Express app that mirrors server.js
// but does NOT call app.listen() – supertest handles the port.
function buildApp() {
  // Ensure env vars satisfy startup checks before requiring server modules
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-32-chars-min-length!!'
  process.env.NODE_ENV   = 'test'

  // Clear require cache so each call produces a fresh app
  Object.keys(require.cache).forEach((key) => {
    if (!key.includes('node_modules')) delete require.cache[key]
  })

  const express      = require('express')
  const cookieParser = require('cookie-parser')
  const cors         = require('cors')
  require('express-async-errors')

  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(cors({ credentials: true }))

  app.use('/api/auth',  require('../routes/auth'))
  app.use('/api/roles', require('../routes/roles'))
  app.use('/api',       require('../routes/core'))
  app.use('/api',       require('../routes/chro'))
  app.use('/api',       require('../routes/candidates'))
  app.use('/api/ai',    require('../routes/ai'))

  app.get('/api/health', (_, res) => res.json({ ok: true }))

  // Simplified error handler (no winston noise in test output)
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal error' })
  })

  return app
}

// ── Test org / user seeding ───────────────────────────────────────────────────
const TEST_ORG_NAME = `__test_org_${Date.now()}`

async function seedTestOrg() {
  // Insert org
  const { rows: [org] } = await dbQuery(
    `INSERT INTO orgs (name, industry, size) VALUES ($1, 'Tech', 'Small') RETURNING id`,
    [TEST_ORG_NAME]
  )

  // Insert roles: admin role and a limited role
  const { rows: [adminRole] } = await dbQuery(
    `INSERT INTO roles (org_id, name, permissions)
     VALUES ($1, 'Test Admin', '{"is_admin": true, "can_manage_roles": true, "can_view_analytics": true}')
     RETURNING id`,
    [org.id]
  )
  const { rows: [limitedRole] } = await dbQuery(
    `INSERT INTO roles (org_id, name, permissions)
     VALUES ($1, 'Test Limited', '{}')
     RETURNING id`,
    [org.id]
  )

  const pw = await bcrypt.hash('TestPass123!', 10)

  // Admin user (chro portal, admin role)
  const { rows: [admin] } = await dbQuery(
    `INSERT INTO users (name, email, role, portal, password_hash, org, org_id, role_id)
     VALUES ($1, $2, 'chro', 'chro', $3, $4, $5, $6) RETURNING *`,
    [`Test Admin ${org.id}`, `admin_${org.id}@test.hiris`, pw, TEST_ORG_NAME, org.id, adminRole.id]
  )

  // Hiring manager user (hiring portal, limited role)
  const { rows: [manager] } = await dbQuery(
    `INSERT INTO users (name, email, role, portal, password_hash, org, org_id, role_id)
     VALUES ($1, $2, 'hiring_manager', 'hiring', $3, $4, $5, $6) RETURNING *`,
    [`Test Manager ${org.id}`, `manager_${org.id}@test.hiris`, pw, TEST_ORG_NAME, org.id, limitedRole.id]
  )

  return { org, adminRole, limitedRole, admin, manager, password: 'TestPass123!' }
}

async function teardownTestOrg(orgId) {
  // Delete in reverse FK order
  await dbQuery(`DELETE FROM interviews    WHERE application_id IN (SELECT id FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE manager_id IN (SELECT id FROM users WHERE org_id=$1)))`, [orgId]).catch(() => {})
  await dbQuery(`DELETE FROM applications  WHERE candidate_id   IN (SELECT id FROM candidates WHERE id IN (SELECT id FROM candidates LIMIT 0))`, [orgId]).catch(() => {})
  await dbQuery(`DELETE FROM headcount_requests WHERE requested_by IN (SELECT id FROM users WHERE org_id=$1)`, [orgId]).catch(() => {})
  await dbQuery(`DELETE FROM jobs           WHERE manager_id    IN (SELECT id FROM users WHERE org_id=$1)`, [orgId]).catch(() => {})
  await dbQuery(`DELETE FROM users          WHERE org_id=$1`, [orgId])
  await dbQuery(`DELETE FROM roles          WHERE org_id=$1`, [orgId])
  await dbQuery(`DELETE FROM orgs           WHERE id=$1`, [orgId])
}

// ── JWT helper ────────────────────────────────────────────────────────────────
function mintCookie(user) {
  const token = jwt.sign(
    { userId: user.id, portal: user.portal, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
  return `hiris_token=${token}`
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function closePool() {
  await pool.end()
}

module.exports = { buildApp, seedTestOrg, teardownTestOrg, mintCookie, dbQuery, closePool, pool }
