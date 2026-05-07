/**
 * __tests__/endpoints.test.js
 *
 * Tests for the remaining data endpoints:
 *   GET /api/health
 *   GET /api/candidates
 *   GET /api/analytics
 *   GET /api/policies
 *   GET /api/interviews
 *   GET /api/active-openings
 *   GET /api/jobs
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

// ─── Health ───────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 { ok: true } with no auth required', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

// ─── Candidates ───────────────────────────────────────────────────────────────

describe('GET /api/candidates', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/candidates')
    expect(res.status).toBe(401)
  })

  it('returns an array of candidate objects', async () => {
    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('each candidate has expected fields', async () => {
    const res = await request(app)
      .get('/api/candidates')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)

    if (res.body.length > 0) {
      const c = res.body[0]
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('email')
      expect(c).toHaveProperty('stage')
    }
  })
})

// ─── Analytics ────────────────────────────────────────────────────────────────

describe('GET /api/analytics', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/analytics')
    expect(res.status).toBe(401)
  })

  it('returns analytics shape for authenticated user', async () => {
    const res = await request(app)
      .get('/api/analytics')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('hiring_funnel')
    expect(res.body).toHaveProperty('candidates_by_source')
    expect(res.body).toHaveProperty('avg_ai_score')
    expect(res.body).toHaveProperty('jobs_by_department')
    expect(Array.isArray(res.body.hiring_funnel)).toBe(true)
    expect(typeof res.body.avg_ai_score).toBe('number')
  })
})

// ─── Policies ─────────────────────────────────────────────────────────────────

describe('GET /api/policies', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/policies')
    expect(res.status).toBe(401)
  })

  it('returns an array of active policies', async () => {
    const res = await request(app)
      .get('/api/policies')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ─── Interviews ───────────────────────────────────────────────────────────────

describe('GET /api/interviews', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/interviews')
    expect(res.status).toBe(401)
  })

  it('returns array or paginated object', async () => {
    const res = await request(app)
      .get('/api/interviews')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('supports pagination via ?page=1&limit=5', async () => {
    const res = await request(app)
      .get('/api/interviews?page=1&limit=5')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('meta')
  })
})

// ─── Jobs ─────────────────────────────────────────────────────────────────────

describe('GET /api/jobs', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/jobs')
    expect(res.status).toBe(401)
  })

  it('returns job listings for authenticated users', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
  })
})

// ─── Active Openings ──────────────────────────────────────────────────────────

describe('GET /api/active-openings', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/active-openings')
    expect(res.status).toBe(401)
  })

  it('returns array for authenticated users', async () => {
    const res = await request(app)
      .get('/api/active-openings')
      .set('Cookie', mintCookie(ctx.admin))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ─── AI stub endpoints ────────────────────────────────────────────────────────

describe('POST /api/ai/score — stub endpoint', () => {
  it('returns 501 Not Implemented', async () => {
    const res = await request(app)
      .post('/api/ai/score')
      .send({ candidate_id: 1 })
    expect(res.status).toBe(501)
  })
})

describe('POST /api/ai/summarize — stub endpoint', () => {
  it('returns 501 Not Implemented', async () => {
    const res = await request(app)
      .post('/api/ai/summarize')
      .send({ candidate_id: 1 })
    expect(res.status).toBe(501)
  })
})
