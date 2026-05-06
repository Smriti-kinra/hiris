const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth } = require('../middleware/auth')

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
router.get('/candidates', requireAuth, async (req, res) => {
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
    WHERE a.stage = ANY(r.visible_stages)
    ORDER BY a.applied_at DESC NULLS LAST
  `, [userId])
  res.json(rows)
})

// ─── Single candidate (full profile) ─────────────────────────────────────────
router.get('/candidates/:id', requireAuth, async (req, res) => {
  const { rows } = await query(`
    SELECT
      c.id::text                   AS id,
      c.name, c.email, c.phone, c.headline, c.location,
      c.resume_url, c.resume_path, c.cv_path,
      COALESCE(c.source,'Direct')  AS source,
      c.ai_score                   AS score,
      c.education, c.experience, c.skills,
      c.ai_summary, c.chatbot_transcript, c.custom_answers,
      c.created_at,
      j.title                      AS role,
      j.department,
      j.id::text                   AS job_id,
      a.id::text                   AS application_id,
      a.applied_at,
      a.notes                      AS application_notes,
      a.manager_notes, a.faculty_notes, a.eval_scores,
      ${stageCase}                 AS stage,
      a.stage                      AS stage_raw
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id
    LEFT JOIN jobs         j ON j.id = a.job_id
    WHERE c.id = $1
  `, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Candidate not found.' })
  res.json(rows[0])
})

// ─── Candidates for a specific job (filtered by role stages) ───────────────
router.get('/jobs/:jobId/candidates', requireAuth, async (req, res) => {
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
    WHERE a.job_id = $1 AND a.stage = ANY(r.visible_stages)
    ORDER BY a.applied_at DESC
  `, [req.params.jobId, userId])
  res.json(rows)
})

// ─── Update application stage ─────────────────────────────────────────────────
router.patch('/candidates/:id/stage', requireAuth, async (req, res) => {
  const { stage } = req.body
  const valid = Object.keys(STAGE_LABEL)
  if (!valid.includes(stage)) return res.status(400).json({ error: 'Invalid stage.' })
  const { rows } = await query(
    `UPDATE applications SET stage=$1 WHERE candidate_id=$2 RETURNING id::text, stage`,
    [stage, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Application not found.' })
  res.json(rows[0])
})

// ─── Save notes ───────────────────────────────────────────────────────────────
router.patch('/candidates/:id/notes', requireAuth, async (req, res) => {
  const { manager_notes, faculty_notes } = req.body
  const { rows } = await query(
    `UPDATE applications SET
       manager_notes = COALESCE($1, manager_notes),
       faculty_notes = COALESCE($2, faculty_notes)
     WHERE candidate_id=$3 RETURNING id::text`,
    [manager_notes ?? null, faculty_notes ?? null, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Application not found.' })
  res.json({ ok: true })
})

module.exports = router
