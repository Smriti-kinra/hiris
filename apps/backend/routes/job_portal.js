const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const path = require('path')
const fs = require('fs')
const { query } = require('../config/db')
const { requireAuth, hasPermission } = require('../middleware/auth')
const { generateBehavioralQuestions, generateApplicationSummary } = require('../services/gemini')

const upload = multer({ dest: 'uploads/' })

router.post('/jobs/:id/post', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!hasPermission(req.currentUser, 'can_post_jobs')) {
    return res.status(403).json({ error: 'Access denied: missing permission can_post_jobs' })
  }
  
  // Verify job exists
  const jobRes = await query(`SELECT * FROM jobs WHERE id = $1 AND org_id = $2`, [id, req.currentUser.orgId])
  if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' })
  
  // Set job status to active
  await query(`UPDATE jobs SET status = 'active', posted_at = NOW(), manager_id = $2 WHERE id = $1 AND org_id = $3`, [id, req.currentUser.userId, req.currentUser.orgId])
  
  // Create or get public job link
  let linkRes = await query(`SELECT * FROM public_job_links WHERE job_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`, [id])
  if (linkRes.rows.length === 0) {
    const token = crypto.randomBytes(16).toString('hex')
    linkRes = await query(`INSERT INTO public_job_links (job_id, token, active) VALUES ($1, $2, true) RETURNING *`, [id, token])
  }
  
  res.json({ success: true, token: linkRes.rows[0].token })
})

router.get('/jobs/public/:token', async (req, res) => {
  const { token } = req.params
  const linkRes = await query(`SELECT job_id FROM public_job_links WHERE token = $1 AND active = true`, [token])
  if (linkRes.rows.length === 0) return res.status(404).json({ error: 'Invalid or inactive job link' })
  
  const jobId = linkRes.rows[0].job_id
  const jobRes = await query(`
    SELECT j.id, j.title, j.department, j.job_type, j.description as summary, 
           j.location, j.posted_at, hr.jd_json, o.name as org_name
    FROM jobs j
    LEFT JOIN headcount_requests hr ON hr.job_id = j.id
    LEFT JOIN orgs o ON o.id = j.org_id
    WHERE j.id = $1 AND j.status != 'closed'
  `, [jobId])
  
  if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found or closed' })
  
  const job = jobRes.rows[0]
  // Extract responsibilities, skills from jd_json if available
  if (job.jd_json) {
    const resp = job.jd_json.responsibilities
    job.responsibilities = Array.isArray(resp) ? resp.join('</li><li>') : (typeof resp === 'string' ? resp : '')
    if (job.responsibilities && Array.isArray(resp)) {
      job.responsibilities = `<ul><li>${job.responsibilities}</li></ul>`
    }
    
    const reqs = job.jd_json.skills || job.jd_json.requirements
    job.skills = Array.isArray(reqs) ? reqs : (typeof reqs === 'string' ? [reqs] : [])
    
    // Extract custom questions
    job.questions = Array.isArray(job.jd_json.questions) ? job.jd_json.questions : []
  }
  
  // Dynamically generate pre-screening questions based on the organization name
  const orgName = job.org_name || 'the organization'
  job.chat_questions = [
    `Why do you want to apply to ${orgName}?`,
    `How would you contribute to the ${orgName} community?`,
    `What differentiates you from other candidates?`
  ]
  
  res.json(job)
})

router.post('/jobs/public/:token/apply', upload.fields([{ name: 'resume_file' }, { name: 'cv_file' }]), async (req, res) => {
  const { token } = req.params
  
  const linkRes = await query(`SELECT job_id FROM public_job_links WHERE token = $1 AND active = true`, [token])
  if (linkRes.rows.length === 0) return res.status(404).json({ error: 'Invalid or inactive job link' })
  
  const jobId = linkRes.rows[0].job_id

  // Fetch org_id from the job so we can tag the candidate and application correctly
  const jobInfo = await query(`SELECT org_id FROM jobs WHERE id = $1`, [jobId])
  if (!jobInfo.rows[0]) return res.status(404).json({ error: 'Job not found' })
  const orgId = jobInfo.rows[0].org_id

  const { name, email, phone, ai_chat_answers, form_answers } = req.body
  
  // Determine file ids and build paths for AI access
  const resumeFileId = req.files['resume_file']?.[0]?.filename || null
  const cvFileId     = req.files['cv_file']?.[0]?.filename || null
  const resumePath   = resumeFileId ? `uploads/${resumeFileId}` : null
  const cvPath       = cvFileId     ? `uploads/${cvFileId}`     : null
  
  // Parse PDF text for AI processing
  let resumeText = ''
  let cvText = ''
  try {
    if (resumeFileId) resumeText = (await pdfParse(fs.readFileSync(req.files['resume_file'][0].path))).text
    if (cvFileId)     cvText     = (await pdfParse(fs.readFileSync(req.files['cv_file'][0].path))).text
  } catch (err) {
    console.error('[APPLY] Failed to parse PDF', err)
  }
  
  // Parse JSON fields
  let parsedChatAnswers = []
  let parsedFormAnswers = {}
  try {
    if (ai_chat_answers) parsedChatAnswers = typeof ai_chat_answers === 'string' ? JSON.parse(ai_chat_answers) : ai_chat_answers
    if (form_answers)    parsedFormAnswers = typeof form_answers    === 'string' ? JSON.parse(form_answers)    : form_answers
  } catch (err) {
    console.error('[APPLY] Failed to parse application answers JSON', err)
  }
  
  // Create Candidate — include org_id and file paths so AI/profile can access documents
  const candRes = await query(`
    INSERT INTO candidates (name, email, phone, source, org_id, resume_path, cv_path, resume_file_id, cv_file_id)
    VALUES ($1, $2, $3, 'Public Portal', $4, $5, $6, $7, $8)
    RETURNING id
  `, [name, email, phone, orgId, resumePath, cvPath, resumeFileId, cvFileId])
  
  const candidateId = candRes.rows[0].id
  
  // Create Application — include org_id so role-based queue filters work
  const appRes = await query(`
    INSERT INTO applications (candidate_id, job_id, stage, resume_file_id, cv_file_id, ai_chat_answers, application_answers, org_id)
    VALUES ($1, $2, 'applied', $3, $4, $5, $6, $7)
    RETURNING id
  `, [candidateId, jobId, resumeFileId, cvFileId, JSON.stringify(parsedChatAnswers), JSON.stringify(parsedFormAnswers), orgId])
  
  const applicationId = appRes.rows[0].id
  
  res.json({ success: true, applicationId, candidateId })
  
  // Background AI processing (non-blocking)
  setImmediate(async () => {
    try {
      // Fetch institutional values for contextually relevant behavioral questions
      let valuesText = ''
      try {
        const valRes = await query(`SELECT filepath FROM policy_documents WHERE category='institutional_values' ORDER BY version DESC LIMIT 1`)
        if (valRes.rows[0]?.filepath) {
          const absPath = path.isAbsolute(valRes.rows[0].filepath)
            ? valRes.rows[0].filepath
            : path.join(__dirname, '..', valRes.rows[0].filepath)
          if (fs.existsSync(absPath)) {
            const { default: pdfParseFn } = await Promise.resolve().then(() => pdfParse)
            valuesText = (await pdfParse(fs.readFileSync(absPath))).text || ''
          }
        }
      } catch (e) {
        console.warn('[APPLY] Could not load institutional values:', e.message)
      }

      // Generate AI application summary
      const summary = await generateApplicationSummary(resumeText, cvText, parsedChatAnswers, name)
      await query(
        `INSERT INTO candidate_summaries (candidate_id, application_id, summary_text) VALUES ($1, $2, $3)`,
        [candidateId, applicationId, summary]
      )
      console.log(`[APPLY] AI summary generated for candidate ${candidateId}`)

      // Generate 10 behavioral questions immediately after application
      const questions = await generateBehavioralQuestions(resumeText, cvText, valuesText, name)
      for (const q of questions) {
        await query(
          `INSERT INTO generated_behavioral_questions (candidate_id, application_id, question) VALUES ($1, $2, $3)`,
          [candidateId, applicationId, q]
        )
      }
      console.log(`[APPLY] ${questions.length} behavioral questions generated for candidate ${candidateId}`)
    } catch (err) {
      console.error('[APPLY] Background AI processing failed:', err.message)
    }
  })
})

router.post('/candidates/:id/generate-summary', requireAuth, async (req, res) => {
  res.status(200).json({ success: true }) // handled in apply flow, this is just a fallback if needed
})

router.post('/candidates/:id/generate-questions', requireAuth, async (req, res) => {
  res.status(200).json({ success: true }) // handled in apply flow
})

router.get('/candidates/:id/questions', requireAuth, async (req, res) => {
  const { id } = req.params
  const qRes = await query(`SELECT * FROM generated_behavioral_questions WHERE candidate_id = $1`, [id])
  res.json(qRes.rows)
})

router.get('/candidates/:id/summary', requireAuth, async (req, res) => {
  const { id } = req.params
  const sRes = await query(`SELECT * FROM candidate_summaries WHERE candidate_id = $1`, [id])
  res.json(sRes.rows.length ? sRes.rows[0] : null)
})

module.exports = router
