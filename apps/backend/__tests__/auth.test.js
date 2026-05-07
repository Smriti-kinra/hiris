/**
 * __tests__/auth.test.js
 *
 * Integration tests for authentication flows:
 *   POST /api/auth/login
 *   GET  /api/auth/me
 *   POST /api/auth/logout
 *   POST /api/auth/register-org
 */

const request = require('supertest')
const { buildApp, seedTestOrg, teardownTestOrg, mintCookie, closePool } = require('./helpers')

let app, ctx

beforeAll(async () => {
  app = buildApp()
  ctx = await seedTestOrg()
})

afterAll(async () => {
  await teardownTestOrg(ctx.org.id)
  await closePool()
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ctx.admin.email })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/i)
  })

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' })
    expect(res.status).toBe(401)
    // Must NOT reveal whether the email exists
    expect(res.body.error).toBe('Invalid email or password.')
  })

  it('returns 401 for correct email but wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ctx.admin.email, password: 'WrongPassword99!' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid email or password.')
  })

  it('is case-insensitive for email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ctx.admin.email.toUpperCase(), password: ctx.password })
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(ctx.admin.id)
  })

  it('returns 200 with user object and sets httpOnly cookie on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ctx.admin.email, password: ctx.password })

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({
      email:  ctx.admin.email,
      portal: 'chro',
    })

    // password_hash must NEVER appear in responses
    expect(res.body.user.password_hash).toBeUndefined()

    // Cookie should be set
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toMatch(/hiris_token=/)
    expect(cookie).toMatch(/HttpOnly/i)
  })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with a tampered / invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'hiris_token=this.is.not.a.real.jwt')
    expect(res.status).toBe(401)
  })

  it('returns 200 with a valid cookie and strips password_hash', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', mintCookie(ctx.admin))

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(ctx.admin.id)
    expect(res.body.user.password_hash).toBeUndefined()
  })

  it('includes RBAC permissions in the response', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', mintCookie(ctx.admin))

    expect(res.status).toBe(200)
    expect(res.body.user.permissions).toBeDefined()
    expect(res.body.user.permissions.is_admin).toBe(true)
  })
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', mintCookie(ctx.admin))

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const cookie = res.headers['set-cookie']?.[0] ?? ''
    // Cookie should be expired (Max-Age=0 or Expires in the past)
    expect(cookie).toMatch(/hiris_token=;|Max-Age=0/i)
  })
})

// ─── POST /api/auth/register-org ─────────────────────────────────────────────

describe('POST /api/auth/register-org', () => {
  it('returns 400 if org name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register-org')
      .send({ org: {}, users: [{ email: 'x@x.com', password: 'abc' }] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/i)
  })

  it('returns 400 if no users are supplied', async () => {
    const res = await request(app)
      .post('/api/auth/register-org')
      .send({ org: { name: 'Ghost Org' }, users: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/user/i)
  })

  it('creates a new org and returns 201 when REGISTRATION_SECRET is not required', async () => {
    // Save and unset the env var so the open path is tested
    const saved = process.env.REGISTRATION_SECRET
    delete process.env.REGISTRATION_SECRET

    const uniqueName = `Reg Test Org ${Date.now()}`
    const res = await request(app)
      .post('/api/auth/register-org')
      .send({
        org: { name: uniqueName, industry: 'Education', size: 'Small' },
        roles: [
          { key: 'chro',            label: 'CHRO',            perms: { is_admin: true } },
          { key: 'hiring-manager',  label: 'Hiring Manager',  perms: {} },
          { key: 'department-leader', label: 'Faculty',       perms: {} },
        ],
        users: [
          {
            name: 'Test Admin',
            email: `ta_${Date.now()}@regtest.hiris`,
            password: 'SecurePass123!',
            role: 'chro',
            portal: 'chro',
          },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.user).toBeDefined()
    expect(res.body.user.password_hash).toBeUndefined()

    // Cookie should be issued
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toMatch(/hiris_token=/)

    // Cleanup
    if (saved !== undefined) process.env.REGISTRATION_SECRET = saved
  })

  it('returns 403 when REGISTRATION_SECRET is set and not supplied', async () => {
    process.env.REGISTRATION_SECRET = 'supersecret'

    const res = await request(app)
      .post('/api/auth/register-org')
      .send({
        org:   { name: 'Blocked Org' },
        users: [{ email: 'x@x.com', password: 'pass', role: 'chro', portal: 'chro' }],
      })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/registration_secret/i)

    delete process.env.REGISTRATION_SECRET
  })
})
