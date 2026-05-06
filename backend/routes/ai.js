const express  = require('express')
const router   = express.Router()
const path     = require('path')
const fs       = require('fs')
const pdfParse = require('pdf-parse')
const { query }       = require('../config/db')
const { requireAuth } = require('../middleware/auth')
const { generateBehavioralQuestions, evaluateBehavioralInterview } = require('../services/gemini')

/**
 * Helper: extract text from a PDF file path relative to backend root.
 */
async function extractPdfText(filePath) {
  if (!filePath) return ''
  const abs = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath)
  if (!fs.existsSync(abs)) {
    console.warn(`[PDF] File not found: ${abs}`)
    return ''
  }
  try {
    const buffer = fs.readFileSync(abs)
    const data = await pdfParse(buffer)
    console.log(`[PDF] Extracted ${data.text?.length || 0} chars from ${path.basename(abs)}`)
    return data.text || ''
  } catch (err) {
    console.error(`[PDF] Extraction failed for ${abs}: ${err.message}`)
    return ''
  }
}

/**
 * Helper: get the latest institutional values text.
 */
async function getInstitutionalValuesText() {
  const { rows } = await query(
    `SELECT filepath FROM policy_documents WHERE category='institutional_values' ORDER BY version DESC LIMIT 1`
  )
  if (!rows[0]) {
    console.log('[AI] No institutional values document found in database.')
    return 'No institutional values document has been uploaded yet.'
  }
  console.log(`[AI] Loading institutional values from: ${rows[0].filepath}`)
  return extractPdfText(rows[0].filepath)
}

// ─── Generate Behavioral Questions for a Candidate ──────────────────────────
router.post('/generate-behavioral-questions', requireAuth, async (req, res) => {
  const { candidate_id } = req.body
  if (!candidate_id) return res.status(400).json({ error: 'candidate_id required.' })

  console.log(`[AI] Question generation request for candidate ${candidate_id}`)

  // Check if already generated
  const { rows: existing } = await query(
    `SELECT questions FROM candidate_questions WHERE candidate_id=$1 AND interview_type='behavioral' ORDER BY generated_at DESC LIMIT 1`,
    [candidate_id]
  )
  if (existing[0] && existing[0].questions?.length > 0) {
    console.log(`[AI] Returning ${existing[0].questions.length} cached questions`)
    return res.json({ questions: existing[0].questions, cached: true })
  }

  // Fetch candidate data
  const { rows: cands } = await query(`SELECT name, resume_path, cv_path FROM candidates WHERE id=$1`, [candidate_id])
  if (!cands[0]) return res.status(404).json({ error: 'Candidate not found.' })

  const candidate = cands[0]
  console.log(`[AI] Candidate: ${candidate.name}, resume=${candidate.resume_path}, cv=${candidate.cv_path}`)

  const [resumeText, cvText, valuesText] = await Promise.all([
    extractPdfText(candidate.resume_path || ''),
    extractPdfText(candidate.cv_path || ''),
    getInstitutionalValuesText()
  ])

  try {
    const questions = await generateBehavioralQuestions(resumeText, cvText, valuesText, candidate.name)

    if (!questions || questions.length === 0) {
      console.error('[AI] Gemini returned no questions')
      return res.status(500).json({ error: 'AI did not return any questions.' })
    }

    // Persist in database
    await query(
      `INSERT INTO candidate_questions (candidate_id, interview_type, questions, source_context)
       VALUES ($1, 'behavioral', $2, $3)`,
      [candidate_id, JSON.stringify(questions), `Resume: ${resumeText.slice(0, 200)}...`]
    )

    console.log(`[AI] ${questions.length} questions generated and stored for candidate ${candidate_id}`)
    res.json({ questions, cached: false })
  } catch (err) {
    console.error('[AI] Question generation failed:', err.message)
    res.status(500).json({ error: 'Failed to generate questions. ' + err.message })
  }
})

// ─── Get Cached Questions for a Candidate ───────────────────────────────────
router.get('/candidates/:id/questions', requireAuth, async (req, res) => {
  console.log(`[AI] Fetching cached questions for candidate ${req.params.id}`)
  const { rows } = await query(
    `SELECT questions, generated_at FROM candidate_questions WHERE candidate_id=$1 AND interview_type='behavioral' ORDER BY generated_at DESC LIMIT 1`,
    [req.params.id]
  )
  if (rows[0]) {
    console.log(`[AI] Found ${rows[0].questions?.length || 0} cached questions`)
  } else {
    console.log(`[AI] No cached questions found for candidate ${req.params.id}`)
  }
  res.json(rows[0] || { questions: [] })
})

// ─── Evaluate Behavioral Interview via Gemini ───────────────────────────────

async function runAIEvaluation(session_id) {
  console.log(`[AI] Running evaluation for session ${session_id}`)

  // Fetch session + candidate info
  const { rows: sessions } = await query(
    `SELECT s.*, c.name AS candidate_name, c.resume_path, a.candidate_id
     FROM interview_sessions s
     JOIN applications a ON a.id = s.application_id
     JOIN candidates c ON c.id = a.candidate_id
     WHERE s.id = $1`,
    [session_id]
  )
  if (!sessions[0]) throw new Error('Session not found.')

  const session = sessions[0]

  // Build transcript text — prefer Whisper audio transcript, fall back to live text
  let transcriptText = ''
  if (session.audio_transcript && session.audio_transcript.trim().length > 20) {
    transcriptText = session.audio_transcript
    console.log(`[AI] Using Whisper audio transcript (${transcriptText.length} chars)`)
  } else if (Array.isArray(session.transcript) && session.transcript.length > 0) {
    transcriptText = session.transcript.map(m => `${m.speaker}: ${m.text}`).join('\n')
    console.log(`[AI] Using live text transcript (${transcriptText.length} chars)`)
  }

  if (!transcriptText || transcriptText.trim().length < 20) {
    console.warn(`[AI] Transcript too short for evaluation`)
    throw new Error('No transcript available for evaluation.')
  }

  const [resumeText, valuesText] = await Promise.all([
    extractPdfText(session.resume_path || ''),
    getInstitutionalValuesText()
  ])

  const aiResult = await evaluateBehavioralInterview(transcriptText, resumeText, valuesText, session.candidate_name)

  // Store AI traits in interview_evaluations
  if (Array.isArray(aiResult.traits)) {
    for (const t of aiResult.traits) {
      await query(
        `INSERT INTO interview_evaluations (session_id, trait_name, score, is_ai, comments)
         VALUES ($1, $2, $3, true, $4)`,
        [session_id, t.name, t.score, t.comments || null]
      )
    }
    console.log(`[AI] Stored ${aiResult.traits.length} AI trait evaluations`)
  }

  // Store AI analysis on the session
  await query(
    `UPDATE interview_sessions SET ai_summary = $1, ai_traits = $2, ai_analysis = $3 WHERE id = $4`,
    [
      aiResult.summary || '',
      JSON.stringify(aiResult.traits || []),
      JSON.stringify({
        institutional_alignment: aiResult.institutional_alignment,
        strengths: aiResult.strengths,
        concerns: aiResult.concerns,
        recommendation: aiResult.recommendation
      }),
      session_id
    ]
  )

  console.log(`[AI] Evaluation complete for session ${session_id}`)
  return aiResult
}

router.post('/evaluate-behavioral-interview', requireAuth, async (req, res) => {
  const { session_id } = req.body
  if (!session_id) return res.status(400).json({ error: 'session_id required.' })
  try {
    const analysis = await runAIEvaluation(session_id)
    res.json({ ok: true, analysis })
  } catch (err) {
    console.error('[AI] Evaluation failed:', err.message)
    res.status(500).json({ error: 'AI evaluation failed. ' + err.message })
  }
})

// ─── Legacy stubs ───────────────────────────────────────────────────────────
router.post('/score', (_req, res) => {
  res.status(501).json({ error: 'Not implemented', message: 'AI scoring planned for future release.' })
})

router.post('/summarize', (_req, res) => {
  res.status(501).json({ error: 'Not implemented', message: 'AI summarization planned for future release.' })
})

router.runAIEvaluation = runAIEvaluation
module.exports = router
