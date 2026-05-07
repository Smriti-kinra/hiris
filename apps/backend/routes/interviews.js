const express  = require('express')
const router   = express.Router()
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { query }       = require('../config/db')
const { requireAuth, requirePermission, requireAnyPermission } = require('../middleware/auth')
const { transcribeAudio } = require('../services/whisper')

// Audio upload config
const AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'recordings')
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true })

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
  filename: (_req, file, cb) => cb(null, `interview_${Date.now()}.webm`)
})
const audioUpload = multer({ storage: audioStorage, limits: { fileSize: 200 * 1024 * 1024 } })

// ─── Start an Interview Session ─────────────────────────────────────────────
router.post('/interviews/start', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { application_id, type } = req.body
  if (!application_id || !['technical', 'behavioral'].includes(type)) {
    return res.status(400).json({ error: 'Valid application_id and type (technical/behavioral) required.' })
  }

  console.log(`[INTERVIEW] Starting ${type} interview for application=${application_id} by user=${req.currentUser.userId}`)

  const { rows: appRows } = await query(
    `SELECT candidate_id, stage FROM applications WHERE id=$1 AND org_id=$2`,
    [application_id, req.currentUser.orgId]
  )
  if (!appRows[0]) return res.status(404).json({ error: 'Application not found.' })

  console.log(`[INTERVIEW] Application stage=${appRows[0].stage}, candidate_id=${appRows[0].candidate_id}`)

  const { rows } = await query(
    `INSERT INTO interview_sessions (application_id, interviewer_id, type, status)
     VALUES ($1, $2, $3, 'ongoing')
     RETURNING id::text, type, status, started_at`,
    [application_id, req.currentUser.userId, type]
  )

  console.log(`[INTERVIEW] Session created: id=${rows[0].id} type=${type}`)
  res.status(201).json({ ...rows[0], candidate_id: appRows[0]?.candidate_id })
})

// ─── Get Interview Session ──────────────────────────────────────────────────
router.get('/interviews/:id', requireAuth, requireAnyPermission(['can_view_interviews', 'can_conduct_interview']), async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, c.name AS candidate_name, c.id AS candidate_id, j.title AS job_title, a.id AS app_id, a.stage
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     JOIN candidates c ON c.id = a.candidate_id
     JOIN jobs j ON j.id = a.job_id
     WHERE s.id = $1 AND a.org_id = $2`,
    [req.params.id, req.currentUser.orgId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })
  res.json(rows[0])
})

// ─── Update Transcript (live text entries) ──────────────────────────────────
router.patch('/interviews/:id/transcript', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { transcript } = req.body
  const { rows } = await query(
    `UPDATE interview_sessions s
     SET transcript = $1
     FROM applications a
     WHERE s.application_id = a.id AND s.id = $2 AND a.org_id = $3
     RETURNING s.id`,
    [JSON.stringify(transcript), req.params.id, req.currentUser.orgId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })
  res.json({ ok: true })
})

// ─── Save Reviewer Notes (mid-interview, without ending session) ─────────────
router.post('/interviews/:id/reviewer-notes', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { notes } = req.body

  if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
    return res.status(400).json({ error: 'Notes cannot be empty.' })
  }

  console.log(`[NOTES] Saving reviewer notes for session=${req.params.id} by user=${req.currentUser.userId}`)

  // 1. Update interviewer_notes on the session itself (for quick access)
  const { rows: sessionRows } = await query(
    `UPDATE interview_sessions s
     SET interviewer_notes = $1
     FROM applications a
     WHERE s.application_id = a.id AND s.id = $2 AND a.org_id = $3
     RETURNING s.id, s.application_id`,
    [notes.trim(), req.params.id, req.currentUser.orgId]
  )
  if (!sessionRows[0]) return res.status(404).json({ error: 'Session not found.' })

  // 2. Upsert into reviewer_notes table for persistent per-reviewer storage
  const appId = sessionRows[0].application_id
  const { rows: appRows } = await query(
    `SELECT a.candidate_id FROM applications a WHERE a.id = $1`,
    [appId]
  )
  const candidateId = appRows[0]?.candidate_id

  // Try to upsert — if row for this session+reviewer exists, update it
  const existing = await query(
    `SELECT id FROM reviewer_notes WHERE session_id=$1 AND reviewer_id=$2`,
    [req.params.id, req.currentUser.userId]
  )
  if (existing.rows[0]) {
    await query(
      `UPDATE reviewer_notes SET notes=$1, updated_at=NOW() WHERE id=$2`,
      [notes.trim(), existing.rows[0].id]
    )
    console.log(`[NOTES] Updated existing reviewer_notes id=${existing.rows[0].id}`)
  } else {
    await query(
      `INSERT INTO reviewer_notes (session_id, reviewer_id, candidate_id, notes)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, req.currentUser.userId, candidateId, notes.trim()]
    )
    console.log(`[NOTES] Created new reviewer_notes for session=${req.params.id}`)
  }

  // 3. Also update faculty_notes on the application for visibility across portals
  if (candidateId) {
    await query(
      `UPDATE applications SET faculty_notes=$1 WHERE candidate_id=$2 AND org_id=$3`,
      [notes.trim(), candidateId, req.currentUser.orgId]
    )
  }

  res.json({ ok: true, message: 'Notes saved successfully.' })
})

// ─── Get Reviewer Notes for a session ───────────────────────────────────────
router.get('/interviews/:id/reviewer-notes', requireAuth, requireAnyPermission(['can_view_interviews', 'can_conduct_interview']), async (req, res) => {
  console.log(`[NOTES] Fetching reviewer notes for session=${req.params.id}`)

  const { rows } = await query(
    `SELECT rn.*, u.name AS reviewer_name
     FROM reviewer_notes rn
     LEFT JOIN users u ON u.id = rn.reviewer_id
     WHERE rn.session_id = $1
     ORDER BY rn.updated_at DESC`,
    [req.params.id]
  )

  // Also return the interviewer_notes from the session itself
  const { rows: sessionRows } = await query(
    `SELECT s.interviewer_notes
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     WHERE s.id = $1 AND a.org_id = $2`,
    [req.params.id, req.currentUser.orgId]
  )

  res.json({
    session_notes: sessionRows[0]?.interviewer_notes || null,
    reviewer_notes: rows
  })
})

// ─── Upload Audio Recording + Trigger Whisper Transcription ─────────────────
router.post('/interviews/:id/audio', requireAuth, requirePermission('can_conduct_interview'), audioUpload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file.' })

  const recordingPath = `uploads/recordings/${req.file.filename}`
  console.log(`[AUDIO] File saved: ${recordingPath} (${(req.file.size / 1024).toFixed(1)} KB) for session=${req.params.id}`)

  const { rows } = await query(
    `UPDATE interview_sessions s
     SET recording_path = $1
     FROM applications a
     WHERE s.application_id = a.id AND s.id = $2 AND a.org_id = $3
     RETURNING s.id`,
    [recordingPath, req.params.id, req.currentUser.orgId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })

  // Attempt Whisper transcription asynchronously
  const absAudioPath = path.join(__dirname, '..', recordingPath)
  transcribeAudio(absAudioPath)
    .then(async (whisperTranscript) => {
      if (whisperTranscript && whisperTranscript.trim().length > 0) {
        console.log(`[AUDIO] Whisper transcription completed for session=${req.params.id}`)
        await query(
          `UPDATE interview_sessions SET audio_transcript = $1 WHERE id = $2`,
          [whisperTranscript, req.params.id]
        )
      } else {
        console.log(`[AUDIO] Whisper unavailable, falling back to live text transcript for session=${req.params.id}`)
        const { rows: session } = await query(
          `SELECT transcript FROM interview_sessions WHERE id=$1`, [req.params.id]
        )
        if (session[0]?.transcript && Array.isArray(session[0].transcript)) {
          const textTranscript = session[0].transcript
            .map(m => `${m.speaker}: ${m.text}`)
            .join('\n')
          await query(
            `UPDATE interview_sessions SET audio_transcript = $1 WHERE id = $2`,
            [textTranscript, req.params.id]
          )
        }
      }
    })
    .then(() => {
      const aiRouter = require('./ai')
      if (aiRouter.runAIEvaluation) {
        return aiRouter.runAIEvaluation(req.params.id).catch(err => {
          console.error(`[AUDIO] Post-transcription AI evaluation failed: ${err.message}`)
        })
      }
    })
    .catch(err => {
      console.error(`[AUDIO] Whisper transcription error: ${err.message}`)
    })

  res.json({ ok: true, recording_path: recordingPath })
})

// ─── Save Manual Evaluations ────────────────────────────────────────────────
router.post('/interviews/:id/evaluation', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { traits, notes, recommendation } = req.body

  console.log(`[EVAL] Saving evaluation for session=${req.params.id}: ${traits?.length || 0} traits, recommendation=${recommendation}`)

  await query('BEGIN')
  try {
    const { rows } = await query(
      `UPDATE interview_sessions s
       SET interviewer_notes = $1, recommendation = $2
       FROM applications a
       WHERE s.application_id = a.id AND s.id = $3 AND a.org_id = $4
       RETURNING s.id`,
      [notes, recommendation, req.params.id, req.currentUser.orgId]
    )
    if (!rows[0]) {
      await query('ROLLBACK')
      return res.status(404).json({ error: 'Session not found.' })
    }

    if (Array.isArray(traits)) {
      for (const t of traits) {
        await query(
          `INSERT INTO interview_evaluations (session_id, trait_name, score, is_ai, comments)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.params.id, t.name, t.score, t.is_ai || false, t.comments || null]
        )
      }
    }
    await query('COMMIT')
    console.log(`[EVAL] Evaluation saved successfully for session=${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    await query('ROLLBACK')
    console.error(`[EVAL] Save failed for session=${req.params.id}: ${err.message}`)
    res.status(500).json({ error: 'Failed to save evaluation.' })
  }
})

// ─── End Interview Session ──────────────────────────────────────────────────
router.post('/interviews/:id/end', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { duration_secs, ai_summary } = req.body
  console.log(`[INTERVIEW] Ending session=${req.params.id}, duration=${duration_secs}s by user=${req.currentUser.userId}`)

  const { rows } = await query(
    `UPDATE interview_sessions s
     SET status = 'completed', ended_at = NOW(), duration_secs = $1, ai_summary = $2
     FROM applications a
     WHERE s.application_id = a.id AND s.id = $3 AND a.org_id = $4
     RETURNING s.id::text, s.status, s.ended_at, s.type, s.application_id`,
    [duration_secs, ai_summary || null, req.params.id, req.currentUser.orgId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })

  // Mark the interview schedule row as completed (if one exists)
  await query(
    `UPDATE interviews i
     SET status = 'completed'
     FROM applications a
     WHERE i.application_id = a.id
       AND a.id = $1
       AND i.status = 'scheduled'`,
    [rows[0].application_id]
  ).catch(err => console.error(`[INTERVIEW] Failed to update schedule status: ${err.message}`))

  console.log(`[INTERVIEW] Session=${req.params.id} marked completed, type=${rows[0].type}`)
  res.json(rows[0])
})

// ─── Proceed / Reject Candidate ─────────────────────────────────────────────
// Faculty flow:  technical interview → final_review (CHRO Final Interview)
// CHRO flow:    behavioral interview → offered
router.post('/interviews/:id/proceed', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { rows: sessions } = await query(
    `SELECT s.application_id, s.type, a.stage, a.candidate_id
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     WHERE s.id = $1 AND a.org_id = $2`,
    [req.params.id, req.currentUser.orgId]
  )
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found.' })

  const { application_id, type, stage, candidate_id } = sessions[0]

  // Determine next stage:
  // technical interview → final_review (faculty approves → CHRO pipeline)
  // behavioral interview → offered (CHRO final decision)
  let nextStage
  if (type === 'technical') {
    nextStage = 'final_review'
  } else if (type === 'behavioral') {
    nextStage = 'offered'
  } else {
    nextStage = 'offered'
  }

  console.log(`[PIPELINE] Proceed: application=${application_id}, type=${type}, ${stage} → ${nextStage} by user=${req.currentUser.userId}`)

  await query('BEGIN')
  try {
    // Update application stage
    await query(`UPDATE applications SET stage = $1 WHERE id = $2`, [nextStage, application_id])

    // Log stage change in history
    await query(
      `INSERT INTO candidate_stage_history (application_id, candidate_id, from_stage, to_stage, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [application_id, candidate_id, stage, nextStage, req.currentUser.userId, `Proceeded after ${type} interview (session ${req.params.id})`]
    ).catch(err => console.error(`[PIPELINE] Stage history insert failed (non-fatal): ${err.message}`))

    await query('COMMIT')
    console.log(`[PIPELINE] Application ${application_id} successfully moved to ${nextStage}`)
    res.json({ ok: true, new_stage: nextStage })
  } catch (err) {
    await query('ROLLBACK')
    console.error(`[PIPELINE] Proceed failed: ${err.message}`)
    res.status(500).json({ error: 'Failed to proceed candidate.' })
  }
})

router.post('/interviews/:id/reject', requireAuth, requirePermission('can_conduct_interview'), async (req, res) => {
  const { rows: sessions } = await query(
    `SELECT s.application_id, a.stage, a.candidate_id
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     WHERE s.id = $1 AND a.org_id = $2`,
    [req.params.id, req.currentUser.orgId]
  )
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found.' })

  const { application_id, stage, candidate_id } = sessions[0]

  console.log(`[PIPELINE] Reject: application=${application_id}, ${stage} → rejected by user=${req.currentUser.userId}`)

  await query(`UPDATE applications SET stage = 'rejected' WHERE id = $1`, [application_id])

  // Log stage history
  await query(
    `INSERT INTO candidate_stage_history (application_id, candidate_id, from_stage, to_stage, changed_by, notes)
     VALUES ($1, $2, $3, 'rejected', $4, 'Rejected after interview')`,
    [application_id, candidate_id, stage, req.currentUser.userId]
  ).catch(() => {})

  console.log(`[PIPELINE] Application ${application_id} REJECTED`)
  res.json({ ok: true, new_stage: 'rejected' })
})

// ─── Get Candidate Interview History ────────────────────────────────────────
router.get('/candidates/:id/interviews', requireAuth, requireAnyPermission(['can_view_interviews', 'can_view_candidates']), async (req, res) => {
  const { rows: sessions } = await query(
    `SELECT s.*, u.name AS interviewer_name
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     LEFT JOIN users u ON u.id = s.interviewer_id
     WHERE a.candidate_id = $1 AND a.org_id = $2 AND s.status = 'completed'
     ORDER BY s.ended_at DESC`,
    [req.params.id, req.currentUser.orgId]
  )

  for (let s of sessions) {
    const { rows: evals } = await query(
      `SELECT trait_name, score, is_ai, comments FROM interview_evaluations WHERE session_id = $1`,
      [s.id]
    )
    s.evaluations = evals
  }

  res.json(sessions)
})

module.exports = router
