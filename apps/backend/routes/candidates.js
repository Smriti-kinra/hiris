const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth, requirePermission, hasPermission } = require('../middleware/auth')

const STAGE_LABEL = {
  applied:              'Applied',
  under_review:         'Under Review',
  technical_interview:  'Technical Interview',
  behavioral_interview: 'Behavioral Interview',
  final_review:         'Final Review',
  offered:              'Offered',
  rejected:             'Rejected',
}
const stageCase = `
  CASE a.stage
    WHEN 'applied'              THEN 'Applied'
    WHEN 'under_review'         THEN 'Under Review'
    WHEN 'technical_interview'  THEN 'Technical Interview'
    WHEN 'behavioral_interview' THEN 'Behavioral Interview'
    WHEN 'final_review'         THEN 'Final Review'
    WHEN 'offered'              THEN 'Offered'
    WHEN 'rejected'             THEN 'Rejected'
    ELSE 'Applied'
  END`

// ─── List candidates filtered by portal/role stages ──────────────────────────
router.get('/candidates', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  const { userId } = req.currentUser

  const { rows } = await query(`
    SELECT
      c.id::text                   AS id,
      c.name, c.email, c.phone, c.headline, c.location,
      j.title                      AS role,
      j.id::text                   AS job_id,
      COALESCE(c.source,'Direct')  AS source,
      a.applied_at,
      a.id::text                   AS application_id,
      ${stageCase}                 AS stage,
      a.stage                      AS stage_raw,
      c.ai_score                   AS score
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id
    LEFT JOIN jobs         j ON j.id = a.job_id
    JOIN users             u ON u.id = $1
    JOIN roles             r ON u.role_id = r.id
    WHERE a.org_id = $2 AND a.stage = ANY(r.visible_stages)
    ORDER BY a.applied_at DESC NULLS LAST
  `, [userId, req.currentUser.orgId])
  res.json(rows)
})

// ─── Single candidate (full profile) ─────────────────────────────────────────
router.get('/candidates/:id', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  const { rows } = await query(`
    SELECT
      c.id::text                   AS id,
      c.name, c.email, c.phone, c.headline, c.location,
      a.resume_file_id             AS resume_path, 
      a.cv_file_id                 AS cv_path,
      COALESCE(c.source,'Direct')  AS source,
      c.ai_score                   AS score,
      c.education, c.experience, c.skills,
      c.created_at,
      j.title                      AS role,
      j.department,
      j.id::text                   AS job_id,
      a.id::text                   AS application_id,
      a.applied_at,
      a.notes                      AS application_notes,
      a.manager_notes, a.faculty_notes, a.eval_scores,
      a.application_answers        AS custom_answers,
      a.ai_chat_answers            AS chatbot_transcript,
      cs.summary_text              AS ai_summary,
      ${stageCase}                 AS stage,
      a.stage                      AS stage_raw
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id
    LEFT JOIN jobs         j ON j.id = a.job_id
    LEFT JOIN candidate_summaries cs ON cs.application_id = a.id
    JOIN users             u ON u.id = $2
    JOIN roles             r ON u.role_id = r.id
    WHERE c.id = $1 AND a.org_id = $3 AND a.stage = ANY(r.visible_stages)
  `, [req.params.id, req.currentUser.userId, req.currentUser.orgId])
  if (!rows[0]) return res.status(404).json({ error: 'Candidate not found.' })
  
  const candidate = rows[0]
  
  // Also fetch generated behavioral questions
  if (candidate.application_id) {
    const qRes = await query(`SELECT question FROM generated_behavioral_questions WHERE application_id = $1`, [candidate.application_id])
    candidate.generated_behavioral_questions = qRes.rows.map(r => r.question)
  } else {
    candidate.generated_behavioral_questions = []
  }
  
  res.json(candidate)
})

// ─── Candidates for a specific job (filtered by role stages) ───────────────
router.get('/jobs/:jobId/candidates', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  const { userId } = req.currentUser
  const { rows } = await query(`
    SELECT
      c.id::text                   AS id,
      c.name, c.email, c.headline,
      a.id::text                   AS application_id,
      a.applied_at,
      ${stageCase}                 AS stage,
      a.stage                      AS stage_raw,
      c.ai_score                   AS score
    FROM applications a
    JOIN candidates c ON c.id = a.candidate_id
    JOIN users u ON u.id = $2
    JOIN roles r ON u.role_id = r.id
    WHERE a.job_id = $1 AND a.org_id = $3 AND a.stage = ANY(r.visible_stages)
    ORDER BY a.applied_at DESC
  `, [req.params.jobId, userId, req.currentUser.orgId])
  res.json(rows)
})

// ─── Update application stage ─────────────────────────────────────────────────
router.patch('/candidates/:id/stage', requireAuth, requirePermission('can_move_candidates'), async (req, res) => {
  const { stage } = req.body
  const valid = Object.keys(STAGE_LABEL)
  if (!valid.includes(stage)) return res.status(400).json({ error: 'Invalid stage.' })
  const { rows } = await query(
    `UPDATE applications SET stage=$1 WHERE candidate_id=$2 AND org_id=$3 RETURNING id::text, stage`,
    [stage, req.params.id, req.currentUser.orgId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Application not found.' })
  res.json(rows[0])
})

// ─── Save notes ───────────────────────────────────────────────────────────────
router.patch('/candidates/:id/notes', requireAuth, requirePermission('can_update_candidate_notes'), async (req, res) => {
  const { manager_notes, faculty_notes, notes } = req.body
  const hasManagerNotes = Object.prototype.hasOwnProperty.call(req.body, 'manager_notes')
  const hasFacultyNotes = Object.prototype.hasOwnProperty.call(req.body, 'faculty_notes')

  if (!hasManagerNotes && !hasFacultyNotes) {
    if (typeof notes !== 'string') return res.status(400).json({ error: 'notes is required.' })
    const noteColumn = (hasPermission(req.currentUser, 'can_review_jd') || hasPermission(req.currentUser, 'can_conduct_interview'))
      ? 'faculty_notes'
      : 'manager_notes'
    const { rows } = await query(
      `UPDATE applications SET ${noteColumn}=$1 WHERE candidate_id=$2 AND org_id=$3 RETURNING id::text`,
      [notes, req.params.id, req.currentUser.orgId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Application not found.' })
    return res.json({ ok: true })
  }

  const { rows } = await query(
    `UPDATE applications SET
       manager_notes = COALESCE($1, manager_notes),
       faculty_notes = COALESCE($2, faculty_notes)
     WHERE candidate_id=$3 AND org_id=$4 RETURNING id::text`,
    [manager_notes ?? null, faculty_notes ?? null, req.params.id, req.currentUser.orgId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Application not found.' })
  res.json({ ok: true })
})

module.exports = router
