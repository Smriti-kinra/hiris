const express  = require('express')
const router   = express.Router()
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { query }       = require('../config/db')
const { requireAuth } = require('../middleware/auth')
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
router.post('/interviews/start', requireAuth, async (req, res) => {
  const { application_id, type } = req.body
  if (!application_id || !['technical', 'behavioral'].includes(type)) {
    return res.status(400).json({ error: 'Valid application_id and type (technical/behavioral) required.' })
  }

  console.log(`[ROUTING] Starting ${type} interview for application ${application_id}`)

  // Also fetch candidate_id for question pre-generation
  const { rows: appRows } = await query(`SELECT candidate_id FROM applications WHERE id=$1`, [application_id])

  const { rows } = await query(
    `INSERT INTO interview_sessions (application_id, interviewer_id, type, status)
     VALUES ($1, $2, $3, 'ongoing')
     RETURNING id::text, type, status, started_at`,
    [application_id, req.currentUser.userId, type]
  )

  console.log(`[INTERVIEW] Session created: ${rows[0].id}`)
  res.status(201).json({ ...rows[0], candidate_id: appRows[0]?.candidate_id })
})

// ─── Get Interview Session ──────────────────────────────────────────────────
router.get('/interviews/:id', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, c.name AS candidate_name, c.id AS candidate_id, j.title AS job_title, a.id AS app_id
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     JOIN candidates c ON c.id = a.candidate_id
     JOIN jobs j ON j.id = a.job_id
     WHERE s.id = $1`,
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })
  res.json(rows[0])
})

// ─── Update Transcript (live text entries) ──────────────────────────────────
router.patch('/interviews/:id/transcript', requireAuth, async (req, res) => {
  const { transcript } = req.body
  const { rows } = await query(
    `UPDATE interview_sessions SET transcript = $1 WHERE id = $2 RETURNING id`,
    [JSON.stringify(transcript), req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })
  res.json({ ok: true })
})

// ─── Upload Audio Recording + Trigger Whisper Transcription ─────────────────
router.post('/interviews/:id/audio', requireAuth, audioUpload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file.' })

  const recordingPath = `uploads/recordings/${req.file.filename}`
  console.log(`[AUDIO] File saved: ${recordingPath} (${(req.file.size / 1024).toFixed(1)} KB)`)

  const { rows } = await query(
    `UPDATE interview_sessions SET recording_path = $1 WHERE id = $2 RETURNING id`,
    [recordingPath, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })

  // Attempt Whisper transcription asynchronously
  const absAudioPath = path.join(__dirname, '..', recordingPath)
  transcribeAudio(absAudioPath)
    .then(async (whisperTranscript) => {
      if (whisperTranscript && whisperTranscript.trim().length > 0) {
        console.log(`[AUDIO] Whisper transcription completed for session ${req.params.id}`)
        await query(
          `UPDATE interview_sessions SET audio_transcript = $1 WHERE id = $2`,
          [whisperTranscript, req.params.id]
        )
      } else {
        console.log(`[AUDIO] Whisper unavailable, falling back to live text transcript`)
        // Fallback: convert the live text transcript to a flat string
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
      // Automatically run AI behavioral grading after transcription is complete
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
router.post('/interviews/:id/evaluation', requireAuth, async (req, res) => {
  const { traits, notes, recommendation } = req.body

  console.log(`[EVAL] Saving evaluation for session ${req.params.id}: ${traits?.length || 0} traits, rec=${recommendation}`)

  await query('BEGIN')
  try {
    await query(
      `UPDATE interview_sessions SET interviewer_notes = $1, recommendation = $2 WHERE id = $3`,
      [notes, recommendation, req.params.id]
    )

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
    console.log(`[EVAL] Evaluation saved successfully for session ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    await query('ROLLBACK')
    console.error(`[EVAL] Save failed: ${err.message}`)
    res.status(500).json({ error: 'Failed to save evaluation.' })
  }
})

// ─── End Interview Session ──────────────────────────────────────────────────
router.post('/interviews/:id/end', requireAuth, async (req, res) => {
  const { duration_secs, ai_summary } = req.body
  console.log(`[INTERVIEW] Ending session ${req.params.id}, duration=${duration_secs}s`)

  const { rows } = await query(
    `UPDATE interview_sessions
     SET status = 'completed', ended_at = NOW(), duration_secs = $1, ai_summary = $2
     WHERE id = $3
     RETURNING id::text, status, ended_at`,
    [duration_secs, ai_summary || null, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Session not found.' })

  console.log(`[INTERVIEW] Session ${req.params.id} marked completed`)
  res.json(rows[0])
})

// ─── Proceed / Reject Candidate ────────────────────────────────────────────
router.post('/interviews/:id/proceed', requireAuth, async (req, res) => {
  const { rows: sessions } = await query(
    `SELECT s.application_id, s.type, a.stage
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     WHERE s.id = $1`,
    [req.params.id]
  )
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found.' })

  const { application_id, type } = sessions[0]

  // Determine next stage based on current interview type
  let nextStage
  if (type === 'technical') {
    nextStage = 'behavioral_interview'
  } else if (type === 'behavioral') {
    nextStage = 'final_review'
  } else {
    nextStage = 'offered'
  }

  await query(`UPDATE applications SET stage = $1 WHERE id = $2`, [nextStage, application_id])
  console.log(`[PIPELINE] Application ${application_id} moved to ${nextStage}`)
  res.json({ ok: true, new_stage: nextStage })
})

router.post('/interviews/:id/reject', requireAuth, async (req, res) => {
  const { rows: sessions } = await query(
    `SELECT application_id FROM interview_sessions WHERE id = $1`, [req.params.id]
  )
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found.' })

  await query(`UPDATE applications SET stage = 'rejected' WHERE id = $1`, [sessions[0].application_id])
  console.log(`[PIPELINE] Application ${sessions[0].application_id} REJECTED`)
  res.json({ ok: true, new_stage: 'rejected' })
})

// ─── Get Candidate Interview History ────────────────────────────────────────
router.get('/candidates/:id/interviews', requireAuth, async (req, res) => {
  const { rows: sessions } = await query(
    `SELECT s.*, u.name AS interviewer_name
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     LEFT JOIN users u ON u.id = s.interviewer_id
     WHERE a.candidate_id = $1 AND s.status = 'completed'
     ORDER BY s.ended_at DESC`,
    [req.params.id]
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
