/**
 * __tests__/hiringRequests.test.js
 *
 * Integration tests for the hiring request lifecycle:
 *   GET   /api/hiring-requests
 *   POST  /api/hiring-requests
 *   PATCH /api/hiring-requests/:id/status  (approve / reject)
 */

const request = require('supertest')
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

// ─── GET /api/hiring-requests ─────────────────────────────────────────────────

describe('GET /api/hiring-requests', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/hiring-requests')
    expect(res.status).toBe(401)
  })

  it('returns an array for authenticated users', async () => {
    const res = await request(app)
      .get('/api/hiring-requests')
      .set('Cookie', mintCookie(ctx.admin))

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('supports page-based pagination', async () => {
    const res = await request(app)
      .get('/api/hiring-requests?page=1&limit=5')
      .set('Cookie', mintCookie(ctx.admin))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('meta')
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 })
    expect(typeof res.body.meta.total).toBe('number')
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ─── POST /api/hiring-requests ────────────────────────────────────────────────

describe('POST /api/hiring-requests', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/hiring-requests')
      .send({ title: 'Anon Job', department: 'HR' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/hiring-requests')
      .set('Cookie', mintCookie(ctx.manager))
      .send({ department: 'Engineering' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/i)
  })

  it('returns 400 when department is missing', async () => {
    const res = await request(app)
      .post('/api/hiring-requests')
      .set('Cookie', mintCookie(ctx.manager))
      .send({ title: 'Senior Engineer' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/department/i)
  })

  let createdRequestId

  it('creates a new hiring request and returns 201 with the record', async () => {
    const res = await request(app)
      .post('/api/hiring-requests')
      .set('Cookie', mintCookie(ctx.manager))
      .send({
        title:      'Professor of Physics',
        department: 'Science',
        job_type:   'Full-time',
        headcount:  2,
        urgency:    'High',
        deadline:   '2027-01-31',
        notes:      'Urgent replacement hire',
      })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title:      'Professor of Physics',
      department: 'Science',
      positions:  2,
      status:     'Pending Review',
    })
    expect(res.body.id).toBeDefined()
    createdRequestId = res.body.id
  })

  // ─── PATCH /api/hiring-requests/:id/status ──────────────────────────────────

  describe('PATCH /api/hiring-requests/:id/status', () => {
    it('returns 400 for an invalid action', async () => {
      const res = await request(app)
        .patch(`/api/hiring-requests/${createdRequestId}/status`)
        .set('Cookie', mintCookie(ctx.admin))
        .send({ action: 'invalidAction' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/approve.*reject/i)
    })

    it('returns 404 for a non-existent request id', async () => {
      const res = await request(app)
        .patch('/api/hiring-requests/99999999/status')
        .set('Cookie', mintCookie(ctx.admin))
        .send({ action: 'approve' })

      expect(res.status).toBe(404)
    })

    it('approves a pending request and returns the updated status', async () => {
      const res = await request(app)
        .patch(`/api/hiring-requests/${createdRequestId}/status`)
        .set('Cookie', mintCookie(ctx.admin))
        .send({ action: 'approve' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('Approved')
    })

    it('posts an approved request and exposes it in hiring posted jobs', async () => {
      const post = await request(app)
        .post(`/api/hiring-requests/${createdRequestId}/post`)
        .set('Cookie', mintCookie(ctx.admin))

      expect(post.status).toBe(200)
      expect(post.body.success).toBe(true)
      expect(post.body.token).toBeTruthy()
      expect(post.body.job).toMatchObject({
        title: 'Professor of Physics',
        status: 'active',
      })

      const postedJobs = await request(app)
        .get('/api/hiring/posted-jobs')
        .set('Cookie', mintCookie(ctx.admin))

      expect(postedJobs.status).toBe(200)
      expect(postedJobs.body.some(job => job.id === post.body.job.id)).toBe(true)

      const dbJob = await dbQuery(`SELECT status, manager_id FROM jobs WHERE id=$1`, [post.body.job.id])
      expect(dbJob.rows[0]).toMatchObject({ status: 'active', manager_id: ctx.admin.id })
    })

    it('can reject a request and returns the updated status', async () => {
      // Create a second request to reject
      const create = await request(app)
        .post('/api/hiring-requests')
        .set('Cookie', mintCookie(ctx.manager))
        .send({ title: 'Temp Role', department: 'HR', headcount: 1 })
      expect(create.status).toBe(201)

      const res = await request(app)
        .patch(`/api/hiring-requests/${create.body.id}/status`)
        .set('Cookie', mintCookie(ctx.admin))
        .send({ action: 'reject', notes: 'Budget constraints' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('Rejected')
    })

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .patch(`/api/hiring-requests/${createdRequestId}/status`)
        .send({ action: 'approve' })
      expect(res.status).toBe(401)
    })
  })
})
