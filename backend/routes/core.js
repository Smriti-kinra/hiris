const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth, requirePermission, requireAnyPermission, hasPermission } = require('../middleware/auth')

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/dashboard/stats', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const [reqStats, openingsCount, candidatesCount] = await Promise.all([
    query(`SELECT COUNT(*) FILTER (WHERE status='pending') AS pending_requests,
                 COUNT(*) FILTER (WHERE status='approved') AS approved_requests
           FROM headcount_requests WHERE org_id = $1`, [req.currentUser.orgId]),
    query(`SELECT COUNT(*)::int AS total FROM jobs WHERE status='active' AND org_id = $1`, [req.currentUser.orgId]),
    query(`SELECT COUNT(*)::int AS total FROM candidates WHERE org_id = $1`, [req.currentUser.orgId]),
  ])
  res.json({
    pending_requests:  parseInt(reqStats.rows[0].pending_requests),
    approved_requests: parseInt(reqStats.rows[0].approved_requests),
    active_openings:   openingsCount.rows[0].total,
    total_candidates:  candidatesCount.rows[0].total,
  })
})

// ─── Faculty Stats ────────────────────────────────────────────────────────────
router.get('/faculty/stats', requireAuth, requireAnyPermission(['can_request_jobs', 'can_review_jd', 'can_conduct_interview']), async (req, res) => {
  const [myReqs, jdPending, scheduled] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM headcount_requests WHERE requested_by=$1 AND org_id=$2`, [req.currentUser.userId, req.currentUser.orgId]),
    query(`SELECT COUNT(*)::int AS count FROM jobs WHERE status='pending' AND org_id=$1`, [req.currentUser.orgId]),
    query(`SELECT COUNT(*)::int AS count
           FROM interviews i
           JOIN applications a ON a.id = i.application_id
           WHERE i.status='scheduled' AND a.org_id=$1`, [req.currentUser.orgId]),
  ])
  res.json({
    my_requests:           myReqs.rows[0].count,
    jds_pending:           jdPending.rows[0].count,
    interviews_scheduled:  scheduled.rows[0].count,
  })
})

// ─── Hiring Requests (list) ───────────────────────────────────────────────────
router.get('/hiring-requests', requireAuth, requirePermission('can_view_requests'), async (req, res) => {
  const page = parseInt(req.query.page)
  const limit = parseInt(req.query.limit) || 10
  const offset = page ? (page - 1) * limit : 0
  const canViewAll = hasPermission(req.currentUser, 'can_view_all_requests')

  const queryStr = `
    SELECT hr.id::text AS id, j.title, j.department,
      COALESCE(j.job_type,'Full-time') AS job_type, hr.headcount AS positions, hr.deadline,
      CASE hr.status WHEN 'pending' THEN 'Pending Review' WHEN 'under_review' THEN 'Sent for Approval'
        WHEN 'approved' THEN 'Approved' WHEN 'rejected' THEN 'Rejected' ELSE hr.status END AS status,
      u.name AS requested_by, hr.requested_by AS requested_by_id, hr.submitted_at
    FROM headcount_requests hr
    LEFT JOIN jobs  j ON j.id=hr.job_id
    LEFT JOIN users u ON u.id=hr.requested_by
    WHERE hr.org_id = $1 ${canViewAll ? '' : 'AND hr.requested_by = $2'}
    ORDER BY hr.submitted_at DESC
    ${page ? `LIMIT $${canViewAll ? 2 : 3} OFFSET $${canViewAll ? 3 : 4}` : ''}`

  const params = canViewAll ? [req.currentUser.orgId] : [req.currentUser.orgId, req.currentUser.userId]
  if (page) params.push(limit, offset)
  const { rows } = await query(queryStr, params)

  if (page) {
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM headcount_requests WHERE org_id=$1 ${canViewAll ? '' : 'AND requested_by=$2'}`,
      canViewAll ? [req.currentUser.orgId] : [req.currentUser.orgId, req.currentUser.userId]
    )
    const total = parseInt(countRows[0].count)
    return res.json({ data: rows, meta: { page, limit, total } })
  }

  res.json(rows)
})

// ─── Hiring Requests (single) ─────────────────────────────────────────────────
router.get('/hiring-requests/:id', requireAuth, requirePermission('can_view_requests'), async (req, res) => {
  const { id } = req.params;
  const canViewAll = hasPermission(req.currentUser, 'can_view_all_requests')
  const { rows } = await query(`
    SELECT hr.id::text AS id, j.title, j.department,
      COALESCE(j.job_type,'Full-time') AS job_type, hr.headcount AS positions, 
      TO_CHAR(hr.deadline, 'Mon DD, YYYY') AS deadline, 
      CASE hr.status WHEN 'pending' THEN 'Pending Review' WHEN 'under_review' THEN 'Sent for Approval'
        WHEN 'approved' THEN 'Approved' WHEN 'rejected' THEN 'Rejected' ELSE hr.status END AS status,
      u.name AS requested_by, hr.requested_by AS requested_by_id,
      hr.notes AS description, j.location, hr.jd_json
    FROM headcount_requests hr
    LEFT JOIN jobs j ON j.id=hr.job_id
    LEFT JOIN users u ON u.id=hr.requested_by
    WHERE hr.id=$1 AND hr.org_id=$2 ${canViewAll ? '' : 'AND hr.requested_by=$3'}
  `, canViewAll ? [id, req.currentUser.orgId] : [id, req.currentUser.orgId, req.currentUser.userId]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
})

// ─── Hiring Requests (create) ─────────────────────────────────────────────────
router.post('/hiring-requests', requireAuth, requirePermission('can_request_jobs'), async (req, res) => {
  const { title, department, job_type, headcount, urgency, deadline, notes } = req.body
  if (!title || !department) return res.status(400).json({ error: 'Title and department are required.' })

  const { rows } = await query(`
    WITH new_job AS (
      INSERT INTO jobs (org_id, title, department, job_type, status, manager_id, location)
      VALUES ($9, $1, $2, $3, 'pending', $4, 'Plaksha University') RETURNING id
    )
    INSERT INTO headcount_requests (org_id, job_id, requested_by, headcount, urgency, deadline, notes, status)
    SELECT $9, id, $4, $5, $6, $7::date, $8, 'pending' FROM new_job
    RETURNING id::text, $1 AS title, $2 AS department, $3 AS job_type,
      headcount AS positions, deadline, 'Pending Review' AS status, submitted_at`,
    [title, department, job_type||'Full-time', req.currentUser.userId,
     headcount||1, urgency||'medium', deadline||null, notes||null, req.currentUser.orgId])
  res.status(201).json(rows[0])
})

// ─── Active Openings ──────────────────────────────────────────────────────────
router.get('/active-openings', requireAuth, requirePermission('can_view_jobs'), async (req, res) => {
  const { rows } = await query(`
    SELECT j.id::text AS id, j.title, j.department, (j.status<>'closed') AS is_open,
      COUNT(a.id)::int AS candidates,
      CASE MAX(CASE a.stage WHEN 'accepted' THEN 5 WHEN 'offered' THEN 4
        WHEN 'interview' THEN 3 WHEN 'screening' THEN 2 WHEN 'applied' THEN 1 ELSE 0 END)
        WHEN 5 THEN 'Offer' WHEN 4 THEN 'Offer' WHEN 3 THEN 'Interview'
        WHEN 2 THEN 'Screening' WHEN 1 THEN 'Applied' ELSE 'Applied' END AS status
    FROM jobs j LEFT JOIN applications a ON a.job_id=j.id
    WHERE j.status='active' AND j.org_id=$1
    GROUP BY j.id,j.title,j.department,j.status ORDER BY j.posted_at DESC`, [req.currentUser.orgId])
  res.json(rows)
})

// ─── Jobs (full list) ─────────────────────────────────────────────────────────
router.get('/jobs', requireAuth, requirePermission('can_view_jobs'), async (req, res) => {
  const page = parseInt(req.query.page)
  const limit = parseInt(req.query.limit) || 10
  const offset = page ? (page - 1) * limit : 0

  const queryStr = `
    SELECT j.id::text AS id, j.title, j.department, j.status, j.job_type,
      COALESCE(j.urgency,'medium') AS urgency, j.description, j.posted_at,
      u.name AS manager, COUNT(a.id)::int AS candidates_count
    FROM jobs j LEFT JOIN users u ON u.id=j.manager_id
    LEFT JOIN applications a ON a.job_id=j.id
    WHERE j.org_id = $1
    GROUP BY j.id,j.title,j.department,j.status,j.job_type,j.urgency,j.description,j.posted_at,u.name
    ORDER BY j.posted_at DESC
    ${page ? 'LIMIT $2 OFFSET $3' : ''}`

  const params = page ? [req.currentUser.orgId, limit, offset] : [req.currentUser.orgId]
  const { rows } = await query(queryStr, params)

  if (page) {
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM jobs WHERE org_id=$1`, [req.currentUser.orgId])
    const total = parseInt(countRows[0].count)
    return res.json({ data: rows, meta: { page, limit, total } })
  }

  res.json(rows)
})

// ─── Interviews ───────────────────────────────────────────────────────────────
router.get('/interviews', requireAuth, requireAnyPermission(['can_view_interviews', 'can_conduct_interview']), async (req, res) => {
  const page = parseInt(req.query.page)
  const limit = parseInt(req.query.limit) || 10
  const offset = page ? (page - 1) * limit : 0

  const activeFilter = req.query.active === 'true' ? "AND a.stage NOT IN ('offered', 'hired', 'rejected', 'archived')" : ''
  const queryStr = `
    SELECT i.id::text AS id, i.application_id::text AS application_id, i.scheduled_at, i.round, i.status, i.notes, i.calendly_link,
      c.name AS candidate_name, c.email AS candidate_email,
      j.title AS job_title, j.department, u.name AS interviewer_name, a.stage
    FROM interviews i
    JOIN applications a ON a.id=i.application_id
    JOIN candidates  c ON c.id=a.candidate_id
    JOIN jobs        j ON j.id=a.job_id
    LEFT JOIN users  u ON u.id=i.interviewer_id
    JOIN users req_user ON req_user.id = $1
    JOIN roles r ON r.id = req_user.role_id
    WHERE a.org_id = $2 AND a.stage = ANY(r.visible_stages) ${activeFilter}
    ORDER BY i.scheduled_at ASC
    ${page ? 'LIMIT $3 OFFSET $4' : ''}`

  const params = page ? [req.currentUser.userId, req.currentUser.orgId, limit, offset] : [req.currentUser.userId, req.currentUser.orgId]
  const { rows } = await query(queryStr, params)

  if (page) {
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM interviews i JOIN applications a ON a.id=i.application_id WHERE a.org_id=$1`,
      [req.currentUser.orgId]
    )
    const total = parseInt(countRows[0].count)
    return res.json({ data: rows, meta: { page, limit, total } })
  }

  res.json(rows)
})

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const [funnel, sources, avgScore, depts] = await Promise.all([
    query(`SELECT stage, COUNT(*)::int AS count FROM applications WHERE org_id=$1 GROUP BY stage
           ORDER BY CASE stage WHEN 'applied' THEN 1 WHEN 'under_review' THEN 2
             WHEN 'technical_interview' THEN 3 WHEN 'behavioral_interview' THEN 4
             WHEN 'final_review' THEN 5 WHEN 'offered' THEN 6 WHEN 'rejected' THEN 7 END`, [req.currentUser.orgId]),
    query(`SELECT COALESCE(source,'Direct') AS source, COUNT(*)::int AS count
           FROM candidates WHERE org_id=$1 GROUP BY source ORDER BY count DESC`, [req.currentUser.orgId]),
    query(`SELECT ROUND(AVG(ai_score),1) AS avg FROM candidates WHERE ai_score IS NOT NULL AND org_id=$1`, [req.currentUser.orgId]),
    query(`SELECT department, COUNT(*)::int AS count FROM jobs WHERE org_id=$1 GROUP BY department ORDER BY count DESC LIMIT 6`, [req.currentUser.orgId]),
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
  const { action, notes, jd_json } = req.body

  if (!['approve', 'reject', 'submit_jd', 'post'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve", "reject", "submit_jd", or "post"' })
  }

  const allowed =
    (['approve', 'reject'].includes(action) && (hasPermission(req.currentUser, 'can_approve_requests') || hasPermission(req.currentUser, 'can_review_jd'))) ||
    (action === 'submit_jd' && hasPermission(req.currentUser, 'can_build_jd')) ||
    (action === 'post' && hasPermission(req.currentUser, 'can_post_jobs'))
  if (!allowed) return res.status(403).json({ error: 'Access denied for this request action.' })

  let newStatus = 'pending'
  if (action === 'approve') newStatus = 'approved'
  if (action === 'reject') newStatus = 'rejected'
  if (action === 'submit_jd') newStatus = 'under_review'
  if (action === 'post') newStatus = 'active' // wait, active goes on the job, but let's say 'posted' for request
  
  if (action === 'post') newStatus = 'posted'

  const { rows } = await query(
    `UPDATE headcount_requests
     SET status=$1 ${action === 'submit_jd' ? ", jd_json=$3" : ""}
     WHERE id=$2 AND org_id=$${action === 'submit_jd' ? '4' : '3'}
     RETURNING id::text,
       CASE status WHEN 'approved' THEN 'Approved' WHEN 'rejected' THEN 'Rejected'
         WHEN 'pending' THEN 'Pending Review' WHEN 'under_review' THEN 'Sent for Approval'
         WHEN 'posted' THEN 'Posted'
         ELSE status END AS status`,
    action === 'submit_jd' ? [newStatus, id, jd_json, req.currentUser.orgId] : [newStatus, id, req.currentUser.orgId]
  )

  if (!rows.length) return res.status(404).json({ error: 'Request not found' })

  // If approving, activate the associated job posting
  if (action === 'approve') {
    await query(
      `UPDATE jobs SET status='active' WHERE id=(
         SELECT job_id FROM headcount_requests WHERE id=$1 AND org_id=$2
       ) AND org_id=$2`,
      [id, req.currentUser.orgId]
    ).catch(() => {}) // non-fatal — job may not exist
  }

  res.json(rows[0])
})

// ─── Policies ─────────────────────────────────────────────────────────────────
router.get('/policies', requireAuth, requirePermission('can_view_policies'), async (req, res) => {
  const { rows } = await query(`SELECT * FROM hiring_policies WHERE active=true ORDER BY category, id`)
  res.json(rows)
})

// ─── Team ─────────────────────────────────────────────────────────────────────
router.get('/chro/team', requireAuth, requirePermission('can_manage_team'), async (req, res) => {
  const { rows } = await query(
    `SELECT
       u.id::text, u.name, u.email, u.role, u.title, u.created_at,
       r.name AS role_name,
       COUNT(hr.id)::int AS active_requests
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN headcount_requests hr
       ON hr.requested_by = u.id AND hr.status IN ('pending', 'under_review')
     WHERE u.org_id = $1 AND u.portal IS NOT NULL
     GROUP BY u.id, r.name
     ORDER BY u.name ASC`,
    [req.currentUser.orgId]
  )
  res.json(rows)
})

module.exports = router
