const express = require('express')
const router = express.Router()
const { query } = require('../config/db')
const { requireAuth, requirePermission } = require('../middleware/auth')

// ── Archive Overview ──────────────────────────────────────────────────────────
router.get('/archive/overview', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const [emp, former, archived, expired] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM employee_profiles WHERE org_id=$1 AND status='active'`, [orgId]),
    query(`SELECT COUNT(*)::int AS count FROM employee_profiles WHERE org_id=$1 AND status IN ('resigned','terminated','retired')`, [orgId]),
    query(`SELECT COUNT(*)::int AS count FROM applications a JOIN candidates c ON c.id=a.candidate_id WHERE a.org_id=$1 AND a.stage='rejected'`, [orgId]),
    query(`SELECT COUNT(*)::int AS count FROM expired_job_archive WHERE org_id=$1`, [orgId]),
  ])
  res.json({
    active_employees: emp.rows[0].count,
    former_employees: former.rows[0].count,
    archived_candidates: archived.rows[0].count,
    expired_jobs: expired.rows[0].count,
  })
})

// ── Archived Candidates ───────────────────────────────────────────────────────
router.get('/archive/candidates', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { search = '', stage, department, min_score, max_score, source } = req.query

  let where = `WHERE a.org_id = $1`
  const params = [orgId]
  let idx = 2

  if (search) {
    where += ` AND (c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR j.title ILIKE $${idx})`
    params.push(`%${search}%`); idx++
  }
  if (stage) { 
    where += ` AND a.stage = $${idx}`; params.push(stage); idx++ 
  } else {
    where += ` AND a.stage IN ('offered', 'hired', 'rejected', 'archived', 'final_review')`
  }
  if (department) { where += ` AND j.department = $${idx}`; params.push(department); idx++ }
  if (min_score) { where += ` AND c.ai_score >= $${idx}`; params.push(min_score); idx++ }
  if (max_score) { where += ` AND c.ai_score <= $${idx}`; params.push(max_score); idx++ }
  if (source) { where += ` AND c.source = $${idx}`; params.push(source); idx++ }

  const { rows } = await query(`
    SELECT
      c.id::text, c.name, c.email, c.phone, c.ai_score AS score,
      COALESCE(c.source,'Direct') AS source,
      j.title AS role, j.department,
      a.id::text AS application_id, a.stage AS stage_raw, a.applied_at,
      CASE a.stage
        WHEN 'offered' THEN 'Offered' WHEN 'rejected' THEN 'Rejected'
        WHEN 'applied' THEN 'Applied' WHEN 'under_review' THEN 'Under Review'
        WHEN 'technical_interview' THEN 'Technical Interview'
        WHEN 'behavioral_interview' THEN 'Behavioral Interview'
        WHEN 'final_review' THEN 'Final Review' ELSE a.stage END AS stage,
      cs.summary_text AS ai_summary,
      ep.status AS employee_status, ep.id::text AS employee_id
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id
    LEFT JOIN jobs j ON j.id = a.job_id
    LEFT JOIN candidate_summaries cs ON cs.application_id = a.id
    LEFT JOIN employee_profiles ep ON ep.candidate_id = c.id AND ep.org_id = $1
    ${where}
    ORDER BY a.applied_at DESC NULLS LAST
  `, params)
  res.json(rows)
})

// ── Archive Candidate Detail (with timeline) ──────────────────────────────────
router.get('/archive/candidates/:id', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { rows } = await query(`
    SELECT c.id::text, c.name, c.email, c.phone, c.ai_score AS score,
      c.education, c.experience, c.skills, c.created_at,
      j.title AS role, j.department,
      a.id::text AS application_id, a.stage AS stage_raw, a.applied_at,
      a.manager_notes, a.faculty_notes, a.eval_scores,
      cs.summary_text AS ai_summary,
      CASE WHEN a.resume_file_id IS NOT NULL THEN 'uploads/' || a.resume_file_id ELSE NULL END AS resume_path,
      ep.id::text AS employee_id, ep.status AS employee_status,
      ep.hire_date, ep.exit_date, ep.department AS emp_department,
      ep.role AS emp_role, ep.salary_band, ep.attrition_risk
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id AND a.org_id = $2
    LEFT JOIN jobs j ON j.id = a.job_id
    LEFT JOIN candidate_summaries cs ON cs.application_id = a.id
    LEFT JOIN employee_profiles ep ON ep.candidate_id = c.id AND ep.org_id = $2
    WHERE c.id = $1
    LIMIT 1
  `, [req.params.id, orgId])

  if (!rows[0]) return res.status(404).json({ error: 'Not found' })

  // Fetch interview sessions for timeline
  const { rows: sessions } = await query(`
    SELECT s.id::text, s.type, s.status, s.started_at, s.ended_at,
      s.interviewer_notes, s.recommendation, s.ai_summary,
      u.name AS interviewer_name
    FROM interview_sessions s
    LEFT JOIN users u ON u.id = s.interviewer_id
    WHERE s.application_id = $1
    ORDER BY s.started_at ASC
  `, [rows[0].application_id])

  res.json({ ...rows[0], interview_sessions: sessions })
})

// ── Employees ─────────────────────────────────────────────────────────────────
router.get('/archive/employees', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { search = '', status, department, min_tenure } = req.query

  let where = `WHERE ep.org_id = $1`
  const params = [orgId]
  let idx = 2

  if (search) {
    where += ` AND (ep.name ILIKE $${idx} OR ep.email ILIKE $${idx} OR ep.role ILIKE $${idx})`
    params.push(`%${search}%`); idx++
  }
  if (status) { where += ` AND ep.status = $${idx}`; params.push(status); idx++ }
  if (department) { where += ` AND ep.department = $${idx}`; params.push(department); idx++ }
  if (min_tenure) {
    where += ` AND ep.hire_date <= NOW() - ($${idx} || ' days')::INTERVAL`
    params.push(min_tenure); idx++
  }

  const { rows } = await query(`
    SELECT ep.id::text, ep.name, ep.email, ep.department, ep.role,
      ep.employment_type, ep.salary_band, ep.hire_date, ep.exit_date,
      ep.status, ep.attrition_risk, ep.ai_score,
      ep.candidate_id::text,
      u.name AS manager_name,
      DATE_PART('day', COALESCE(ep.exit_date, NOW()) - ep.hire_date)::int AS tenure_days
    FROM employee_profiles ep
    LEFT JOIN users u ON u.id = ep.manager_id
    ${where}
    ORDER BY ep.hire_date DESC NULLS LAST
  `, params)
  res.json(rows)
})

// ── Single Employee with Lifecycle ────────────────────────────────────────────
router.get('/archive/employees/:id', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { rows } = await query(`
    SELECT ep.*, u.name AS manager_name,
      DATE_PART('day', COALESCE(ep.exit_date, NOW()) - ep.hire_date)::int AS tenure_days
    FROM employee_profiles ep
    LEFT JOIN users u ON u.id = ep.manager_id
    WHERE ep.id = $1 AND ep.org_id = $2
  `, [req.params.id, orgId])
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })

  const { rows: events } = await query(`
    SELECT e.*, u.name AS recorded_by_name
    FROM employee_lifecycle_events e
    LEFT JOIN users u ON u.id = e.recorded_by
    WHERE e.employee_id = $1 ORDER BY e.event_date DESC
  `, [req.params.id])

  const { rows: exitInfo } = await query(`
    SELECT * FROM employee_exit_history WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1
  `, [req.params.id])

  res.json({ ...rows[0], lifecycle_events: events, exit_info: exitInfo[0] || null })
})

// ── Create Employee Profile (from offered candidate) ──────────────────────────
router.post('/archive/employees', requireAuth, requirePermission('can_make_final_decision'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { candidate_id, application_id, name, email, department, role,
    manager_id, employment_type, salary_band, hire_date } = req.body

  if (!name) return res.status(400).json({ error: 'name is required' })

  // Get AI score from candidate
  const { rows: cRows } = await query(`SELECT ai_score FROM candidates WHERE id=$1`, [candidate_id])

  const { rows } = await query(`
    INSERT INTO employee_profiles
      (org_id, candidate_id, application_id, name, email, department, role,
       manager_id, employment_type, salary_band, hire_date, status, ai_score)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12)
    ON CONFLICT DO NOTHING
    RETURNING id::text, name, status, hire_date
  `, [orgId, candidate_id||null, application_id||null, name, email||null,
      department||null, role||null, manager_id||null,
      employment_type||'Full-time', salary_band||null,
      hire_date||null, cRows[0]?.ai_score||null])

  if (!rows[0]) return res.status(409).json({ error: 'Employee profile may already exist.' })

  // Log hired event
  await query(`
    INSERT INTO employee_lifecycle_events (org_id, employee_id, event_type, event_date, title, recorded_by)
    VALUES ($1,$2,'hired',$3,'Employee Joined',$4)
  `, [orgId, parseInt(rows[0].id), hire_date||new Date().toISOString().slice(0,10), req.currentUser.userId])

  res.status(201).json(rows[0])
})

// ── Add Lifecycle Event ───────────────────────────────────────────────────────
router.post('/archive/employees/:id/events', requireAuth, requirePermission('can_manage_team'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { event_type, event_date, title, description, metadata } = req.body
  if (!event_type || !event_date) return res.status(400).json({ error: 'event_type and event_date required' })

  const { rows } = await query(`
    INSERT INTO employee_lifecycle_events
      (org_id, employee_id, event_type, event_date, title, description, metadata, recorded_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id::text, event_type, event_date, title
  `, [orgId, req.params.id, event_type, event_date, title||null,
      description||null, metadata ? JSON.stringify(metadata) : '{}', req.currentUser.userId])

  res.status(201).json(rows[0])
})

// ── Record Employee Exit ──────────────────────────────────────────────────────
router.patch('/archive/employees/:id/exit', requireAuth, requirePermission('can_manage_team'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { exit_type, exit_date, exit_reason, rehire_eligible, exit_interview_notes,
    notice_given, notice_period_days, final_salary_band } = req.body

  if (!exit_type || !exit_date) return res.status(400).json({ error: 'exit_type and exit_date required' })

  // Get employee to compute tenure
  const { rows: empRows } = await query(
    `SELECT hire_date, role, department, salary_band FROM employee_profiles WHERE id=$1 AND org_id=$2`,
    [req.params.id, orgId]
  )
  if (!empRows[0]) return res.status(404).json({ error: 'Employee not found' })

  const tenureDays = empRows[0].hire_date
    ? Math.round((new Date(exit_date) - new Date(empRows[0].hire_date)) / 86400000)
    : null

  await query(`
    UPDATE employee_profiles SET status=$1, exit_date=$2, updated_at=NOW()
    WHERE id=$3 AND org_id=$4
  `, [exit_type === 'voluntary' ? 'resigned' : 'terminated', exit_date, req.params.id, orgId])

  const { rows } = await query(`
    INSERT INTO employee_exit_history
      (org_id, employee_id, exit_type, exit_date, exit_reason, rehire_eligible,
       exit_interview_notes, notice_given, notice_period_days,
       final_role, final_department, final_salary_band, tenure_days, recorded_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING id::text, exit_type, exit_date
  `, [orgId, req.params.id, exit_type, exit_date, exit_reason||null,
      rehire_eligible !== false, exit_interview_notes||null,
      notice_given||false, notice_period_days||0,
      empRows[0].role, empRows[0].department,
      final_salary_band||empRows[0].salary_band, tenureDays,
      req.currentUser.userId])

  // Log exited event
  await query(`
    INSERT INTO employee_lifecycle_events (org_id, employee_id, event_type, event_date, title, description, recorded_by)
    VALUES ($1,$2,'exited',$3,'Employee Exited',$4,$5)
  `, [orgId, req.params.id, exit_date, exit_reason||null, req.currentUser.userId])

  res.json(rows[0])
})

// ── Expired Job Openings ──────────────────────────────────────────────────────
router.get('/archive/expired-jobs', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { search = '', department, status } = req.query
  let where = `WHERE j.org_id = $1`
  const params = [orgId]
  let idx = 2
  if (search) { where += ` AND (j.title ILIKE $${idx} OR j.department ILIKE $${idx})`; params.push(`%${search}%`); idx++ }
  if (department) { where += ` AND j.department = $${idx}`; params.push(department); idx++ }
  if (status) { where += ` AND j.status = $${idx}`; params.push(status); idx++ }

  const { rows } = await query(`
    SELECT j.id::text, j.title, j.department, j.status, j.job_type, j.location,
      j.posted_at, j.description,
      u.name AS manager, hr.id::text AS request_id, requester.name AS requested_by,
      COUNT(a.id)::int AS candidates_count
    FROM jobs j
    LEFT JOIN users u ON u.id=j.manager_id
    LEFT JOIN headcount_requests hr ON hr.job_id=j.id
    LEFT JOIN users requester ON requester.id=hr.requested_by
    LEFT JOIN applications a ON a.job_id=j.id
    ${where}
    GROUP BY j.id,j.title,j.department,j.status,j.job_type,j.location,
      j.posted_at,j.description,u.name,hr.id,requester.name
    ORDER BY j.posted_at DESC NULLS LAST, j.id DESC
  `, params)
  res.json(rows)
})

// ── Expired Job — Applicants ──────────────────────────────────────────────────
router.get('/archive/expired-jobs/:id/candidates', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const { rows: job } = await query(
    `SELECT job_id FROM expired_job_archive WHERE id=$1 AND org_id=$2`,
    [req.params.id, orgId]
  )
  if (!job[0]) return res.status(404).json({ error: 'Not found' })

  const { rows } = await query(`
    SELECT c.id::text, c.name, c.email, c.ai_score AS score,
      a.stage AS stage_raw, a.applied_at,
      CASE a.stage WHEN 'offered' THEN 'Offered' WHEN 'rejected' THEN 'Rejected'
        WHEN 'applied' THEN 'Applied' WHEN 'under_review' THEN 'Under Review'
        ELSE a.stage END AS stage
    FROM applications a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.job_id = $1
    ORDER BY a.applied_at DESC
  `, [job[0].job_id])
  res.json(rows)
})

// ── Archive Analytics ─────────────────────────────────────────────────────────
router.get('/archive/analytics', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const orgId = req.currentUser.orgId
  const [retention, attrition, sources, deptStats, hiringFunnel] = await Promise.all([
    // Retention: active employees / total ever hired
    query(`
      SELECT
        COUNT(*)::int AS total_ever_hired,
        COUNT(*) FILTER (WHERE status='active')::int AS currently_active,
        ROUND(
          COUNT(*) FILTER (WHERE status='active')::numeric /
          NULLIF(COUNT(*),0) * 100, 1
        ) AS retention_rate_pct
      FROM employee_profiles WHERE org_id=$1
    `, [orgId]),
    // Attrition by month (last 12)
    query(`
      SELECT TO_CHAR(exit_date,'YYYY-MM') AS month, COUNT(*)::int AS exits
      FROM employee_profiles
      WHERE org_id=$1 AND exit_date IS NOT NULL
        AND exit_date >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC
    `, [orgId]),
    // Source effectiveness
    query(`
      SELECT COALESCE(c.source,'Direct') AS source,
        COUNT(*)::int AS total_applied,
        COUNT(*) FILTER (WHERE a.stage='offered')::int AS total_hired
      FROM candidates c
      JOIN applications a ON a.candidate_id=c.id
      WHERE a.org_id=$1
      GROUP BY source ORDER BY total_hired DESC LIMIT 8
    `, [orgId]),
    // Department stability
    query(`
      SELECT department,
        COUNT(*) FILTER (WHERE status='active')::int AS active,
        COUNT(*) FILTER (WHERE status IN ('resigned','terminated'))::int AS exited,
        ROUND(AVG(DATE_PART('day', COALESCE(exit_date,NOW()) - hire_date))::numeric, 0)::int AS avg_tenure_days
      FROM employee_profiles WHERE org_id=$1 AND department IS NOT NULL
      GROUP BY department ORDER BY active DESC
    `, [orgId]),
    // Hiring funnel
    query(`
      SELECT stage, COUNT(*)::int AS count
      FROM applications WHERE org_id=$1
      GROUP BY stage
      ORDER BY CASE stage WHEN 'applied' THEN 1 WHEN 'under_review' THEN 2
        WHEN 'technical_interview' THEN 3 WHEN 'behavioral_interview' THEN 4
        WHEN 'final_review' THEN 5 WHEN 'offered' THEN 6 WHEN 'rejected' THEN 7 END
    `, [orgId]),
  ])

  res.json({
    retention: retention.rows[0],
    attrition_by_month: attrition.rows,
    source_effectiveness: sources.rows,
    department_stability: deptStats.rows,
    hiring_funnel: hiringFunnel.rows,
  })
})

// ── Auto-archive expired jobs (call on startup) ───────────────────────────────
async function autoArchiveExpiredJobs(orgId) {
  try {
    // Find active jobs past their deadline that aren't already archived
    const { rows: expiredJobs } = await query(`
      SELECT j.id, j.title, j.department, j.job_type, j.description, j.location,
        j.posted_at, j.org_id,
        hr.jd_json, hr.requested_by,
        COUNT(a.id)::int AS total_applicants,
        COUNT(a.id) FILTER (WHERE a.stage='offered')::int AS total_hired,
        COUNT(a.id) FILTER (WHERE a.stage='rejected')::int AS total_rejected
      FROM jobs j
      LEFT JOIN headcount_requests hr ON hr.job_id = j.id
      LEFT JOIN applications a ON a.job_id = j.id
      LEFT JOIN expired_job_archive eja ON eja.job_id = j.id
      WHERE j.status = 'active'
        AND hr.deadline IS NOT NULL
        AND hr.deadline < CURRENT_DATE
        AND eja.id IS NULL
        ${orgId ? 'AND j.org_id = ' + parseInt(orgId) : ''}
      GROUP BY j.id, j.title, j.department, j.job_type, j.description, j.location, j.posted_at, j.org_id, hr.jd_json, hr.requested_by
    `)

    for (const job of expiredJobs) {
      await query(`
        INSERT INTO expired_job_archive
          (org_id, job_id, title, department, job_type, description, jd_json,
           location, posted_at, close_reason, total_applicants, total_hired,
           total_rejected, requested_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'expired',$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
      `, [job.org_id, job.id, job.title, job.department, job.job_type,
          job.description, job.jd_json||'{}', job.location, job.posted_at,
          job.total_applicants, job.total_hired, job.total_rejected, job.requested_by])

      // Mark job as closed
      await query(`UPDATE jobs SET status='closed' WHERE id=$1`, [job.id])
    }
    if (expiredJobs.length > 0) {
      console.log(`[ARCHIVE] Auto-archived ${expiredJobs.length} expired job(s)`)
    }
  } catch (err) {
    console.error('[ARCHIVE] Auto-archive error:', err.message)
  }
}

// Run auto-archive on startup for all orgs
autoArchiveExpiredJobs(null)

module.exports = router
