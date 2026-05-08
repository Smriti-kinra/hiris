const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth, requirePermission, requireAnyPermission, hasPermission } = require('../middleware/auth')

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

function normalizeJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return [value]
  return fallback
}

function normalizeJsonObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return fallback
}

function buildCandidateSummary({ assessment, finalRecommendation }) {
  const strengths = normalizeJsonArray(assessment?.strengths)
  const gaps = normalizeJsonArray(assessment?.watch_outs || assessment?.gaps)

  return [
    '# AI Candidate Assessment',
    `Overall fit score: ${assessment?.overall_fit_score ?? 'N/A'}/10. ${assessment?.fit_justification || ''}`.trim(),
    `Technical skill match: ${assessment?.technical_skill_match_percent ?? 'N/A'}%.`,
    strengths.length ? `## Strengths\n${strengths.map(s => `- ${typeof s === 'string' ? s : `${s.title || 'Strength'}: ${s.evidence || s.detail || ''}`}`).join('\n')}` : '',
    gaps.length ? `## Watch-outs\n${gaps.map(g => `- ${typeof g === 'string' ? g : `${g.title || 'Watch-out'}: ${g.detail || g.evidence || ''}`}`).join('\n')}` : '',
    assessment?.culture_growth_indicators ? `## Culture & Growth\n${assessment.culture_growth_indicators}` : '',
    assessment?.compensation_band_estimate ? `## Compensation Band\n${assessment.compensation_band_estimate}` : '',
    finalRecommendation ? `## Final Recommendation\n${finalRecommendation}` : '',
  ].filter(Boolean).join('\n\n')
}

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
// Create or update a complete candidate profile through the API.
router.post('/candidates', requireAuth, requirePermission('can_move_candidates'), async (req, res) => {
  const {
    candidate = {},
    role_applied,
    application = {},
    education = [],
    experience = [],
    skills = [],
    assessment = {},
    pipeline = [],
    interviewer_feedback = [],
    final_recommendation,
  } = req.body || {}

  if (!candidate.name || !candidate.email) {
    return res.status(400).json({ error: 'candidate.name and candidate.email are required.' })
  }

  const roleTitle = role_applied || application.role || candidate.role
  if (!roleTitle) return res.status(400).json({ error: 'role_applied is required.' })

  const stage = application.stage || 'final_review'
  if (!Object.prototype.hasOwnProperty.call(STAGE_LABEL, stage)) {
    return res.status(400).json({ error: 'Invalid application.stage.' })
  }

  const orgId = req.currentUser.orgId
  const appliedAt = application.applied_at || '2026-05-08T00:00:00.000Z'
  const source = application.source || candidate.source || 'Direct'
  const summaryText = assessment.ai_summary || buildCandidateSummary({ assessment, finalRecommendation: final_recommendation })

  await query('BEGIN')
  try {
    const { rows: existingJobRows } = await query(
      `SELECT id FROM jobs WHERE org_id=$1 AND LOWER(title)=LOWER($2) ORDER BY id DESC LIMIT 1`,
      [orgId, roleTitle]
    )

    let jobId = existingJobRows[0]?.id
    if (!jobId) {
      const { rows } = await query(
        `INSERT INTO jobs (org_id, title, department, status, job_type, urgency, location, manager_id)
         VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)
         RETURNING id`,
        [
          orgId,
          roleTitle,
          application.department || 'Engineering',
          application.job_type || 'Full-time',
          application.urgency || 'high',
          application.job_location || candidate.location || null,
          req.currentUser.userId,
        ]
      )
      jobId = rows[0].id
    }

    const headline = candidate.headline || `${roleTitle} candidate | ${candidate.location || 'Location not specified'}`
    const customAnswers = normalizeJsonArray(candidate.custom_answers, [
      { question: 'LinkedIn', answer: candidate.linkedin || '' },
      { question: 'GitHub', answer: candidate.github || '' },
      { question: 'Overall recommendation', answer: assessment.overall_recommendation || application.overall_recommendation || 'Strong Hire' },
    ].filter(qa => qa.answer))

    const { rows: existingCandidates } = await query(
      `SELECT id FROM candidates WHERE org_id=$1 AND LOWER(email)=LOWER($2) ORDER BY id DESC LIMIT 1`,
      [orgId, candidate.email]
    )

    let candidateId
    const candidateValues = [
      candidate.name,
      candidate.phone || null,
      headline,
      candidate.location || null,
      source,
      assessment.ai_score ?? assessment.overall_score_percent ?? 91,
      JSON.stringify(normalizeJsonArray(education)),
      JSON.stringify(normalizeJsonArray(experience)),
      JSON.stringify(normalizeJsonArray(skills)),
      summaryText,
      JSON.stringify(customAnswers),
    ]

    if (existingCandidates[0]) {
      candidateId = existingCandidates[0].id
      await query(
        `UPDATE candidates SET
           name=$1, phone=$2, headline=$3, location=$4, source=$5, ai_score=$6,
           education=$7, experience=$8, skills=$9, ai_summary=$10, custom_answers=$11
         WHERE id=$12 AND org_id=$13`,
        [...candidateValues, candidateId, orgId]
      )
    } else {
      const { rows } = await query(
        `INSERT INTO candidates
          (org_id, name, email, phone, headline, location, source, ai_score, education, experience, skills, ai_summary, custom_answers)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [orgId, candidate.name, candidate.email, ...candidateValues.slice(1)]
      )
      candidateId = rows[0].id
    }

    const evalScores = normalizeJsonObject(application.eval_scores, {
      overall_fit: Math.round((Number(assessment.overall_fit_score) || 9.1) * 10),
      technical_match: Number(assessment.technical_skill_match_percent) || 93,
      risk_level: assessment.risk_level || 'low_to_moderate',
      pipeline,
    })

    const { rows: appRows } = await query(
      `INSERT INTO applications
        (org_id, candidate_id, job_id, stage, applied_at, notes, manager_notes, faculty_notes, eval_scores, application_answers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (candidate_id, job_id) DO UPDATE SET
         stage=EXCLUDED.stage,
         applied_at=EXCLUDED.applied_at,
         notes=EXCLUDED.notes,
         manager_notes=EXCLUDED.manager_notes,
         faculty_notes=EXCLUDED.faculty_notes,
         eval_scores=EXCLUDED.eval_scores,
         application_answers=EXCLUDED.application_answers,
         org_id=EXCLUDED.org_id
       RETURNING id`,
      [
        orgId,
        candidateId,
        jobId,
        stage,
        appliedAt,
        application.notes || 'All hiring stages completed and assessed. Make an Offer pending.',
        application.manager_notes || final_recommendation || 'Strong Hire. Make-offer action remains.',
        application.faculty_notes || 'Technical and culture rounds passed with strong interviewer feedback.',
        JSON.stringify(evalScores),
        JSON.stringify({ pipeline, interviewer_feedback, assessment }),
      ]
    )
    const applicationId = appRows[0].id

    await query(
      `INSERT INTO candidate_summaries (candidate_id, application_id, summary_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (application_id) DO UPDATE SET summary_text=EXCLUDED.summary_text, generated_at=NOW()`,
      [candidateId, applicationId, summaryText]
    )

    await query(`DELETE FROM interview_evaluations WHERE session_id IN (SELECT id FROM interview_sessions WHERE application_id=$1)`, [applicationId])
    await query(`DELETE FROM interview_sessions WHERE application_id=$1`, [applicationId])

    for (const feedback of normalizeJsonArray(interviewer_feedback).filter(f => f && (f.type === 'technical' || f.type === 'behavioral'))) {
      const { rows: sessionRows } = await query(
        `INSERT INTO interview_sessions
          (application_id, interviewer_id, type, status, started_at, ended_at, duration_secs, interviewer_notes, recommendation, ai_summary, ai_analysis, transcript)
         VALUES ($1,$2,$3,'completed',NOW() - INTERVAL '7 days',NOW() - INTERVAL '7 days' + INTERVAL '45 minutes',$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          applicationId,
          req.currentUser.userId,
          feedback.type,
          feedback.duration_secs || 2700,
          feedback.notes || feedback.summary || '',
          feedback.recommendation || 'strong_hire',
          feedback.ai_summary || null,
          JSON.stringify(feedback.ai_analysis || {}),
          JSON.stringify(feedback.transcript || []),
        ]
      )

      for (const trait of normalizeJsonArray(feedback.traits)) {
        await query(
          `INSERT INTO interview_evaluations (session_id, trait_name, score, is_ai, comments)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            sessionRows[0].id,
            trait.name,
            Math.max(0, Math.min(10, Number(trait.score) || 0)),
            !!trait.is_ai,
            trait.comments || null,
          ]
        )
      }
    }

    await query(`DELETE FROM candidate_stage_history WHERE application_id=$1`, [applicationId]).catch(() => {})
    for (const item of normalizeJsonArray(pipeline)) {
      await query(
        `INSERT INTO candidate_stage_history (application_id, candidate_id, from_stage, to_stage, changed_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          applicationId,
          candidateId,
          item.from_stage || null,
          item.to_stage || item.stage || stage,
          req.currentUser.userId,
          item.notes || `${item.name || item.stage || 'Pipeline stage'}: ${item.status || 'Passed'}${item.score ? ` (${item.score})` : ''}`,
        ]
      ).catch(() => {})
    }

    await query('COMMIT')
    res.status(existingCandidates[0] ? 200 : 201).json({
      id: String(candidateId),
      application_id: String(applicationId),
      job_id: String(jobId),
      stage,
      created: !existingCandidates[0],
    })
  } catch (err) {
    await query('ROLLBACK')
    console.error(`[CANDIDATE_CREATE] Failed: ${err.message}`)
    res.status(500).json({ error: 'Failed to save candidate profile.' })
  }
})

router.get('/candidates/:id', requireAuth, requirePermission('can_view_candidates'), async (req, res) => {
  const { rows } = await query(`
    SELECT
      c.id::text                   AS id,
      c.name, c.email, c.phone, c.headline, c.location,
      CASE WHEN a.resume_file_id IS NOT NULL THEN 'uploads/' || a.resume_file_id ELSE NULL END AS resume_path, 
      CASE WHEN a.cv_file_id IS NOT NULL THEN 'uploads/' || a.cv_file_id ELSE NULL END AS cv_path,
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

// ─── Update application stage ──────────────────────────────────────────────
// KEY FIX: When moving a candidate to 'technical_interview', auto-create
// an entry in the interviews (schedule) table so faculty can see it.
router.patch('/candidates/:id/stage', requireAuth, requirePermission('can_move_candidates'), async (req, res) => {
  const { stage } = req.body
  const valid = Object.keys(STAGE_LABEL)
  if (!valid.includes(stage)) return res.status(400).json({ error: 'Invalid stage.' })

  console.log(`[STAGE] Moving candidate=${req.params.id} to stage=${stage} by user=${req.currentUser.userId}`)

  await query('BEGIN')
  try {
    // 1. Update the application stage
    const { rows } = await query(
      `UPDATE applications SET stage=$1 WHERE candidate_id=$2 AND org_id=$3
       RETURNING id::text AS application_id, stage, candidate_id`,
      [stage, req.params.id, req.currentUser.orgId]
    )
    if (!rows[0]) {
      await query('ROLLBACK')
      return res.status(404).json({ error: 'Application not found.' })
    }

    const { application_id, candidate_id } = rows[0]

    // 2. Log stage history for audit trail
    await query(
      `INSERT INTO candidate_stage_history (application_id, candidate_id, to_stage, changed_by, notes)
       VALUES ($1, $2, $3, $4, 'Manual stage update via portal')`,
      [application_id, candidate_id, stage, req.currentUser.userId]
    ).catch(err => console.error(`[STAGE] History log failed (non-fatal): ${err.message}`))

    // 3. If moving to technical_interview, auto-create schedule row
    //    so the candidate appears in Faculty Schedules / Interviews tab
    if (stage === 'technical_interview') {
      // Check if a schedule row already exists (avoid duplicates)
      const { rows: existingRows } = await query(
        `SELECT id FROM interviews WHERE application_id=$1 AND status='scheduled'`,
        [application_id]
      )
      if (existingRows.length === 0) {
        const { rows: schedRows } = await query(
          `INSERT INTO interviews (application_id, interviewer_id, scheduled_at, round, interview_type, status, notes)
           VALUES ($1, $2, NOW() + INTERVAL '24 hours', 'Technical Interview', 'technical', 'scheduled', 'Auto-scheduled on stage advancement')
           RETURNING id::text`,
          [application_id, req.currentUser.userId]
        )
        console.log(`[STAGE] Auto-created technical interview schedule: id=${schedRows[0]?.id} for application=${application_id}`)
      } else {
        console.log(`[STAGE] Schedule already exists for application=${application_id}, skipping auto-create`)
      }
    }

    // 4. If moving to final_review, log prominently for CHRO visibility
    if (stage === 'final_review') {
      console.log(`[PIPELINE] *** Candidate ${candidate_id} (app ${application_id}) moved to FINAL REVIEW — will appear in CHRO Final Interview tab ***`)
    }

    await query('COMMIT')
    console.log(`[STAGE] Successfully moved candidate=${req.params.id} to ${stage}`)
    res.json({ id: application_id, stage })
  } catch (err) {
    await query('ROLLBACK')
    console.error(`[STAGE] Stage update failed: ${err.message}`)
    res.status(500).json({ error: 'Failed to update stage.' })
  }
})

// ─── Save notes ───────────────────────────────────────────────────────────────
// Allow anyone who can view candidates (hiring managers, faculty, CHRO) to save notes.
// The note column written to is determined by the caller's role.
router.patch('/candidates/:id/notes', requireAuth, requireAnyPermission(['can_update_candidate_notes', 'can_view_candidates', 'can_conduct_interview']), async (req, res) => {
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
