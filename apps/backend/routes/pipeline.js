const express = require('express')
const router  = express.Router()
const { query } = require('../config/db')
const { requireAuth, requirePermission, requireAnyPermission } = require('../middleware/auth')

// ─── GET /api/pipeline/final-interview ───────────────────────────────────────
// Returns all applications in 'final_review' stage for the CHRO Final Interview tab.
// Includes candidate details, job info, and latest interview session data.
router.get('/pipeline/final-interview', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  console.log(`[PIPELINE] CHRO final-interview fetch by user=${req.currentUser.userId} org=${req.currentUser.orgId}`)

  const { rows } = await query(`
    SELECT
      a.id::text                    AS application_id,
      c.id::text                    AS candidate_id,
      c.name                        AS candidate_name,
      c.email                       AS candidate_email,
      c.phone                       AS candidate_phone,
      c.headline,
      c.ai_score                    AS score,
      j.title                       AS job_title,
      j.department,
      j.id::text                    AS job_id,
      a.stage,
      a.applied_at,
      a.faculty_notes,
      a.manager_notes,
      -- Latest completed interview session
      ls.id::text                   AS latest_session_id,
      ls.type                       AS latest_session_type,
      ls.recommendation             AS latest_recommendation,
      ls.interviewer_notes          AS latest_interviewer_notes,
      ls.ended_at                   AS latest_interview_ended_at,
      lu.name                       AS latest_interviewer_name,
      -- Scheduled final interview (if any)
      fi.id::text                   AS final_interview_id,
      fi.scheduled_at               AS final_interview_scheduled_at,
      fi.status                     AS final_interview_status,
      fi.round                      AS final_interview_round
    FROM applications a
    JOIN candidates c ON c.id = a.candidate_id
    JOIN jobs j ON j.id = a.job_id
    LEFT JOIN LATERAL (
      SELECT s.*, u.name AS interviewer_name_inner
      FROM interview_sessions s
      LEFT JOIN users u ON u.id = s.interviewer_id
      WHERE s.application_id = a.id AND s.status = 'completed'
      ORDER BY s.ended_at DESC
      LIMIT 1
    ) ls ON true
    LEFT JOIN users lu ON lu.id = ls.interviewer_id
    LEFT JOIN LATERAL (
      SELECT i.*
      FROM interviews i
      WHERE i.application_id = a.id
      ORDER BY i.created_at DESC
      LIMIT 1
    ) fi ON true
    WHERE a.org_id = $1
      AND a.stage IN ('behavioral_interview', 'final_review')
    ORDER BY a.applied_at DESC
  `, [req.currentUser.orgId])

  console.log(`[PIPELINE] Found ${rows.length} candidates in final_review stage`)
  res.json(rows)
})

// ─── GET /api/pipeline/stage-counts ──────────────────────────────────────────
// Returns candidate counts per stage for CHRO analytics/dashboard.
router.get('/pipeline/stage-counts', requireAuth, requirePermission('can_view_analytics'), async (req, res) => {
  const { rows } = await query(`
    SELECT stage, COUNT(*)::int AS count
    FROM applications
    WHERE org_id = $1
    GROUP BY stage
    ORDER BY CASE stage
      WHEN 'applied'              THEN 1
      WHEN 'under_review'         THEN 2
      WHEN 'technical_interview'  THEN 3
      WHEN 'behavioral_interview' THEN 4
      WHEN 'final_review'         THEN 5
      WHEN 'offered'              THEN 6
      WHEN 'rejected'             THEN 7
      ELSE 8 END
  `, [req.currentUser.orgId])
  res.json(rows)
})

// ─── POST /api/pipeline/schedule-final-interview ─────────────────────────────
// Create a final interview schedule entry for a candidate in final_review stage.
router.post('/pipeline/schedule-final-interview', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { application_id, scheduled_at, interviewer_id, notes } = req.body
  if (!application_id) return res.status(400).json({ error: 'application_id is required.' })

  console.log(`[PIPELINE] Scheduling final interview for application=${application_id}`)

  // Verify application is in final_review
  const { rows: appRows } = await query(
    `SELECT id, stage FROM applications WHERE id=$1 AND org_id=$2`,
    [application_id, req.currentUser.orgId]
  )
  if (!appRows[0]) return res.status(404).json({ error: 'Application not found.' })
  if (!['behavioral_interview', 'final_review'].includes(appRows[0].stage)) {
    return res.status(400).json({ error: `Application must be in behavioral_interview or final_review stage (currently: ${appRows[0].stage}).` })
  }

  const { rows } = await query(`
    INSERT INTO interviews (application_id, interviewer_id, scheduled_at, round, status, notes)
    VALUES ($1, $2, $3, 'Final Interview', 'scheduled', $4)
    RETURNING id::text, scheduled_at, status, round
  `, [application_id, interviewer_id || req.currentUser.userId, scheduled_at || null, notes || null])

  console.log(`[PIPELINE] Final interview scheduled: id=${rows[0].id}`)
  res.status(201).json(rows[0])
})

module.exports = router
