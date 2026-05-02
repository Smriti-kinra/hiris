/**
 * __tests__/permissions.test.js
 *
 * Integration tests for the RBAC / permission-gating layer.
 * Verifies that:
 *   1. Unauthenticated requests are rejected.
 *   2. Authenticated users WITHOUT a required permission are rejected (403).
 *   3. Authenticated users WITH the required permission are accepted (2xx).
 *   4. Admin users bypass all individual permission checks.
 *   5. Users with NULL role_id get zero permissions and are denied.
 */

const request = require('supertest')
const bcrypt  = require('bcryptjs')
const { buildApp, seedTestOrg, teardownTestOrg, mintCookie, closePool, dbQuery } = require('./helpers')

let app, ctx

beforeAll(async () => {
  app = buildApp()
  ctx = await seedTestOrg()
})

afterAll(async () => {
  await teardownTestOrg(ctx.org.id)
  await closePool()
})

// ─── /api/dashboard/stats requires can_view_analytics ────────────────────────

describe('GET /api/dashboard/stats — requires can_view_analytics', () => {
  it('returns 401 with no cookie', async () => {
    const res = await request(app).get('/api/dashboard/stats')
    expect(res.status).toBe(401)
  })

  it('returns 403 for a user without the permission', async () => {
    // ctx.manager has the "limited" role with no permissions
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', mintCookie(ctx.manager))
    expect(res.status).toBe(403)
  })

  it('returns 200 for an admin user', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('pending_requests')
    expect(res.body).toHaveProperty('total_candidates')
  })
})

// ─── /api/roles requires can_manage_roles ────────────────────────────────────

describe('GET /api/roles — requires can_manage_roles', () => {
  it('returns 401 with no cookie', async () => {
    const res = await request(app).get('/api/roles')
    expect(res.status).toBe(401)
  })

  it('returns 403 for a limited user', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Cookie', mintCookie(ctx.manager))
    expect(res.status).toBe(403)
  })

  it('returns 200 for an admin user', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ─── Role CRUD gating ─────────────────────────────────────────────────────────

describe('POST /api/roles — requires can_manage_roles', () => {
  it('returns 403 for a limited user', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Cookie', mintCookie(ctx.manager))
      .send({ name: 'Sneaky Role', permissions: { is_admin: true } })
    expect(res.status).toBe(403)
  })

  let createdRoleId

  it('creates a role when the user has can_manage_roles', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Cookie', mintCookie(ctx.admin))
      .send({ name: `Test Role ${Date.now()}`, permissions: { can_view_analytics: true } })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    createdRoleId = res.body.id
  })

  it('returns 400 when role name is missing', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Cookie', mintCookie(ctx.admin))
      .send({ permissions: {} })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/i)
  })

  it('returns 409 on duplicate role name within the same org', async () => {
    const name = `Dup Role ${Date.now()}`
    await request(app)
      .post('/api/roles')
      .set('Cookie', mintCookie(ctx.admin))
      .send({ name, permissions: {} })

    const res = await request(app)
      .post('/api/roles')
      .set('Cookie', mintCookie(ctx.admin))
      .send({ name, permissions: {} })

    expect(res.status).toBe(409)
  })

  it('updates a role (PUT)', async () => {
    const res = await request(app)
      .put(`/api/roles/${createdRoleId}`)
      .set('Cookie', mintCookie(ctx.admin))
      .send({ permissions: { can_view_analytics: true, can_manage_roles: false } })
    expect(res.status).toBe(200)
    expect(res.body.permissions.can_view_analytics).toBe(true)
  })

  it('deletes a role that has no users assigned', async () => {
    const res = await request(app)
      .delete(`/api/roles/${createdRoleId}`)
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when deleting a non-existent role', async () => {
    const res = await request(app)
      .delete('/api/roles/99999999')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(404)
  })
})

// ─── Null role_id edge case ───────────────────────────────────────────────────

describe('NULL role_id — user silently gets zero permissions', () => {
  let nullRoleUser

  beforeAll(async () => {
    // Create a user with no role_id
    const pw = await bcrypt.hash('TestPass123!', 10)
    const { rows: [u] } = await dbQuery(
      `INSERT INTO users (name, email, role, portal, password_hash, org, org_id, role_id)
       VALUES ('No Role', $1, 'chro', 'chro', $2, $3, $4, NULL) RETURNING *`,
      [`norole_${Date.now()}@test.hiris`, pw, 'Test Org', ctx.org.id]
    )
    nullRoleUser = u
  })

  afterAll(async () => {
    if (nullRoleUser) {
      await dbQuery('DELETE FROM users WHERE id=$1', [nullRoleUser.id]).catch(() => {})
    }
  })

  it('returns 403 on any permission-protected route', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Cookie', mintCookie(nullRoleUser))
    expect(res.status).toBe(403)
  })

  it('can still access routes that only require auth (not permission)', async () => {
    const res = await request(app)
      .get('/api/hiring-requests')
      .set('Cookie', mintCookie(nullRoleUser))
    expect(res.status).toBe(200)
  })
})

// ─── Token forgery ────────────────────────────────────────────────────────────

describe('JWT forgery attempt', () => {
  it('returns 401 with a forged token signed by a wrong secret', async () => {
    const jwt = require('jsonwebtoken')
    const forged = jwt.sign(
      { userId: ctx.admin.id, portal: 'chro', role: 'chro' },
      'wrong-secret-should-not-work',
      { expiresIn: '1h' }
    )
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `hiris_token=${forged}`)
    expect(res.status).toBe(401)
  })
})
