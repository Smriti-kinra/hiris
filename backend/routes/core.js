const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth, requirePermission } = require('../middleware/auth')

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/dashboard/stats', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const [reqStats, openingsCount, candidatesCount] = await Promise.all([
    query(`SELECT COUNT(*) FILTER (WHERE status='pending') AS pending_requests,
                 COUNT(*) FILTER (WHERE status='approved') AS approved_requests
           FROM headcount_requests`),
    query(`SELECT COUNT(*)::int AS total FROM jobs WHERE status='active'`),
    query(`SELECT COUNT(*)::int AS total FROM candidates`),
  ])
  res.json({
    pending_requests:  parseInt(reqStats.rows[0].pending_requests),
    approved_requests: parseInt(reqStats.rows[0].approved_requests),
    active_openings:   openingsCount.rows[0].total,
    total_candidates:  candidatesCount.rows[0].total,
  })
})

// ─── Faculty Stats ────────────────────────────────────────────────────────────
router.get('/faculty/stats', requireAuth, async (req, res) => {
  const [myReqs, jdPending, scheduled] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM headcount_requests WHERE requested_by=$1`, [req.currentUser.userId]),
    query(`SELECT COUNT(*)::int AS count FROM jobs WHERE status='pending'`),
    query(`SELECT COUNT(*)::int AS count FROM interviews WHERE status='scheduled'`),
  ])
  res.json({
    my_requests:           myReqs.rows[0].count,
    jds_pending:           jdPending.rows[0].count,
    interviews_scheduled:  scheduled.rows[0].count,
  })
})

// ─── Hiring Requests (list) ───────────────────────────────────────────────────
router.get('/hiring-requests', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page)
  const limit = parseInt(req.query.limit) || 10
  const offset = page ? (page - 1) * limit : 0

  const queryStr = `
    SELECT hr.id::text AS id, j.title, j.department,
      COALESCE(j.job_type,'Full-time') AS job_type, hr.headcount AS positions, hr.deadline,
      CASE hr.status WHEN 'pending' THEN 'Pending Review' WHEN 'under_review' THEN 'Sent for Approval'
        WHEN 'approved' THEN 'Approved' WHEN 'rejected' THEN 'Rejected' ELSE hr.status END AS status,
      u.name AS requested_by, hr.submitted_at
    FROM headcount_requests hr
    LEFT JOIN jobs  j ON j.id=hr.job_id
    LEFT JOIN users u ON u.id=hr.requested_by
    ORDER BY hr.submitted_at DESC
    ${page ? 'LIMIT $1 OFFSET $2' : ''}`

  const params = page ? [limit, offset] : []
  const { rows } = await query(queryStr, params)

  if (page) {
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM headcount_requests`)
    const total = parseInt(countRows[0].count)
    return res.json({ data: rows, meta: { page, limit, total } })
  }

  res.json(rows)
})

// ─── Hiring Requests (create) ─────────────────────────────────────────────────
router.post('/hiring-requests', requireAuth, async (req, res) => {
  const { title, department, job_type, headcount, urgency, deadline, notes } = req.body
  if (!title || !department) return res.status(400).json({ error: 'Title and department are required.' })

  const { rows } = await query(`
    WITH new_job AS (
      INSERT INTO jobs (title, department, job_type, status, manager_id, location)
      VALUES ($1, $2, $3, 'pending', $4, 'Plaksha University') RETURNING id
    )
    INSERT INTO headcount_requests (job_id, requested_by, headcount, urgency, deadline, notes, status)
    SELECT id, $4, $5, $6, $7::date, $8, 'pending' FROM new_job
    RETURNING id::text, $1 AS title, $2 AS department, $3 AS job_type,
      headcount AS positions, deadline, 'Pending Review' AS status, submitted_at`,
    [title, department, job_type||'Full-time', req.currentUser.userId,
     headcount||1, urgency||'medium', deadline||null, notes||null])
  res.status(201).json(rows[0])
})

// ─── Active Openings ──────────────────────────────────────────────────────────
router.get('/active-openings', requireAuth, async (req, res) => {
  const { rows } = await query(`
    SELECT j.id::text AS id, j.title, j.department, (j.status<>'closed') AS is_open,
      COUNT(a.id)::int AS candidates,
      CASE MAX(CASE a.stage WHEN 'accepted' THEN 5 WHEN 'offered' THEN 4
        WHEN 'interview' THEN 3 WHEN 'screening' THEN 2 WHEN 'applied' THEN 1 ELSE 0 END)
        WHEN 5 THEN 'Offer' WHEN 4 THEN 'Offer' WHEN 3 THEN 'Interview'
        WHEN 2 THEN 'Screening' WHEN 1 THEN 'Applied' ELSE 'Applied' END AS status
    FROM jobs j LEFT JOIN applications a ON a.job_id=j.id
    WHERE j.status='active' GROUP BY j.id,j.title,j.department,j.status ORDER BY j.posted_at DESC`)
  res.json(rows)
})

// ─── Jobs (full list) ─────────────────────────────────────────────────────────
router.get('/jobs', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page)
  const limit = parseInt(req.query.limit) || 10
  const offset = page ? (page - 1) * limit : 0

  const queryStr = `
    SELECT j.id::text AS id, j.title, j.department, j.status, j.job_type,
      COALESCE(j.urgency,'medium') AS urgency, j.description, j.posted_at,
      u.name AS manager, COUNT(a.id)::int AS candidates_count
    FROM jobs j LEFT JOIN users u ON u.id=j.manager_id
    LEFT JOIN applications a ON a.job_id=j.id
    GROUP BY j.id,j.title,j.department,j.status,j.job_type,j.urgency,j.description,j.posted_at,u.name
    ORDER BY j.posted_at DESC
    ${page ? 'LIMIT $1 OFFSET $2' : ''}`

  const params = page ? [limit, offset] : []
  const { rows } = await query(queryStr, params)

  if (page) {
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM jobs`)
    const total = parseInt(countRows[0].count)
    return res.json({ data: rows, meta: { page, limit, total } })
  }

  res.json(rows)
})

// ─── Interviews ───────────────────────────────────────────────────────────────
router.get('/interviews', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page)
  const limit = parseInt(req.query.limit) || 10
  const offset = page ? (page - 1) * limit : 0

  const queryStr = `
    SELECT i.id::text AS id, i.scheduled_at, i.round, i.status, i.notes, i.calendly_link,
      c.name AS candidate_name, c.email AS candidate_email,
      j.title AS job_title, j.department, u.name AS interviewer_name
    FROM interviews i
    JOIN applications a ON a.id=i.application_id
    JOIN candidates  c ON c.id=a.candidate_id
    JOIN jobs        j ON j.id=a.job_id
    LEFT JOIN users  u ON u.id=i.interviewer_id
    ORDER BY i.scheduled_at ASC
    ${page ? 'LIMIT $1 OFFSET $2' : ''}`

  const params = page ? [limit, offset] : []
  const { rows } = await query(queryStr, params)

  if (page) {
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM interviews`)
    const total = parseInt(countRows[0].count)
    return res.json({ data: rows, meta: { page, limit, total } })
  }

  res.json(rows)
})

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics', requireAuth, async (req, res) => {
  const [funnel, sources, avgScore, depts] = await Promise.all([
    query(`SELECT stage, COUNT(*)::int AS count FROM applications GROUP BY stage
           ORDER BY CASE stage WHEN 'applied' THEN 1 WHEN 'screening' THEN 2
             WHEN 'interview' THEN 3 WHEN 'offered' THEN 4 WHEN 'accepted' THEN 5 WHEN 'rejected' THEN 6 END`),
    query(`SELECT COALESCE(source,'Direct') AS source, COUNT(*)::int AS count
           FROM candidates GROUP BY source ORDER BY count DESC`),
    query(`SELECT ROUND(AVG(ai_score),1) AS avg FROM candidates WHERE ai_score IS NOT NULL`),
    query(`SELECT department, COUNT(*)::int AS count FROM jobs GROUP BY department ORDER BY count DESC LIMIT 6`),
  ])
  res.json({
    hiring_funnel:        funnel.rows,
    candidates_by_source: sources.rows,
    avg_ai_score:         parseFloat(avgScore.rows[0]?.avg) || 0,
    jobs_by_department:   depts.rows,
  })
})

// ─── Hiring Request Approve / Reject ─────────────────────────────────────────
router.patch('/hiring-requests/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params
  const { action, notes } = req.body // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const { rows } = await query(
    `UPDATE headcount_requests
     SET status=$1, updated_at=NOW()
     WHERE id=$2
     RETURNING id::text,
       CASE status WHEN 'approved' THEN 'Approved' WHEN 'rejected' THEN 'Rejected'
         WHEN 'pending' THEN 'Pending Review' WHEN 'under_review' THEN 'Sent for Approval'
         ELSE status END AS status`,
    [newStatus, id]
  )

  if (!rows.length) return res.status(404).json({ error: 'Request not found' })

  // If approving, activate the associated job posting
  if (action === 'approve') {
    await query(
      `UPDATE jobs SET status='active' WHERE id=(
         SELECT job_id FROM headcount_requests WHERE id=$1
       )`,
      [id]
    ).catch(() => {}) // non-fatal — job may not exist
  }

  res.json(rows[0])
})

// ─── Policies ─────────────────────────────────────────────────────────────────
router.get('/policies', requireAuth, async (req, res) => {
  const { rows } = await query(`SELECT * FROM hiring_policies WHERE active=true ORDER BY category, id`)
  res.json(rows)
})

module.exports = router
