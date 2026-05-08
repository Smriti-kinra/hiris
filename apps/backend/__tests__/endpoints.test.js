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
const { buildApp, seedTestOrg, teardownTestOrg, mintCookie, closePool, dbQuery } = require('./helpers')

let app, ctx

beforeAll(async () => {
  app = buildApp()
  ctx = await seedTestOrg()
})

afterAll(async () => {
  if (ctx?.org?.id) {
    await dbQuery(`DELETE FROM candidates WHERE org_id=$1 AND email=$2`, [ctx.org.id, 'subhi.verma@email.com']).catch(() => {})
    await teardownTestOrg(ctx.org.id)
  }
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

describe('POST /api/candidates', () => {
  it('creates a complete candidate profile that appears in the candidate list', async () => {
    const payload = {
      candidate: {
        name: 'Subhi Verma',
        email: 'subhi.verma@email.com',
        phone: '+91 98765 43210',
        location: 'Gurugram, Haryana, India',
        linkedin: 'linkedin.com/in/subhiverma',
        github: 'github.com/subhiverma',
      },
      role_applied: 'Software Development Engineer II (SDE-2)',
      application: {
        source: 'Direct',
        stage: 'final_review',
        applied_at: '2026-05-08T00:00:00.000Z',
      },
      education: [{ degree: 'B.Tech, Computer Science & Engineering', institution: 'Delhi Technological University (DTU)', year: '2016-2020', grade: '8.7/10' }],
      experience: [{ role: 'SDE-2', company: 'Flipkart', duration: 'Aug 2022-Present', desc: 'Owned backend systems and latency improvements.' }],
      skills: ['Java', 'Python', 'Go', 'TypeScript', 'Kafka', 'AWS', 'Kubernetes'],
      assessment: {
        overall_fit_score: 9.1,
        technical_skill_match_percent: 93,
        overall_recommendation: 'Strong Hire',
      },
      final_recommendation: 'Strong Hire. All stages passed; make an offer.',
    }

    const createRes = await request(app)
      .post('/api/candidates')
      .set('Cookie', mintCookie(ctx.admin))
      .send(payload)

    expect(createRes.status).toBe(201)
    expect(createRes.body.stage).toBe('final_review')

    const listRes = await request(app)
      .get('/api/candidates')
      .set('Cookie', mintCookie(ctx.admin))

    expect(listRes.status).toBe(200)
    expect(listRes.body.some(c => c.email === 'subhi.verma@email.com')).toBe(true)
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
