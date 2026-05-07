const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const { query } = require('../config/db')
const { requireAuth } = require('../middleware/auth')
const { generateBehavioralQuestions, generateApplicationSummary } = require('../services/gemini')
const fs = require('fs')

const upload = multer({ dest: 'uploads/' })

router.post('/jobs/:id/post', requireAuth, async (req, res) => {
  const { id } = req.params
  
  // Verify job exists
  const jobRes = await query(`SELECT * FROM jobs WHERE id = $1`, [id])
  if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' })
  
  // Set job status to active
  await query(`UPDATE jobs SET status = 'active' WHERE id = $1`, [id])
  
  // Create or get public job link
  let linkRes = await query(`SELECT * FROM public_job_links WHERE job_id = $1`, [id])
  if (linkRes.rows.length === 0) {
    const token = crypto.randomBytes(16).toString('hex')
    linkRes = await query(`INSERT INTO public_job_links (job_id, token) VALUES ($1, $2) RETURNING *`, [id, token])
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
           j.location, j.posted_at, hr.jd_json 
    FROM jobs j
    LEFT JOIN headcount_requests hr ON hr.job_id = j.id
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
  
  res.json(job)
})

router.post('/jobs/public/:token/apply', upload.fields([{ name: 'resume_file' }, { name: 'cv_file' }]), async (req, res) => {
  const { token } = req.params
  
  const linkRes = await query(`SELECT job_id FROM public_job_links WHERE token = $1 AND active = true`, [token])
  if (linkRes.rows.length === 0) return res.status(404).json({ error: 'Invalid or inactive job link' })
  
  const jobId = linkRes.rows[0].job_id
  const { name, email, phone, ai_chat_answers, form_answers } = req.body
  
  // Store files
  const resumeFileId = req.files['resume_file']?.[0]?.filename || null
  const cvFileId = req.files['cv_file']?.[0]?.filename || null
  
  // Parse PDF
  let resumeText = ''
  let cvText = ''
  try {
    if (resumeFileId) resumeText = (await pdfParse(fs.readFileSync(req.files['resume_file'][0].path))).text
    if (cvFileId) cvText = (await pdfParse(fs.readFileSync(req.files['cv_file'][0].path))).text
  } catch (err) {
    console.error('Failed to parse PDF', err)
  }
  
  // Create Candidate
  const candRes = await query(`
    INSERT INTO candidates (name, email, phone, source)
    VALUES ($1, $2, $3, 'Public Portal')
    RETURNING id
  `, [name, email, phone])
  
  const candidateId = candRes.rows[0].id
  
  // Create Application
  const parsedChatAnswers = typeof ai_chat_answers === 'string' ? JSON.parse(ai_chat_answers) : ai_chat_answers || []
  const parsedFormAnswers = typeof form_answers === 'string' ? JSON.parse(form_answers) : form_answers || {}
  
  const appRes = await query(`
    INSERT INTO applications (candidate_id, job_id, stage, resume_file_id, cv_file_id, ai_chat_answers, application_answers)
    VALUES ($1, $2, 'applied', $3, $4, $5, $6)
    RETURNING id
  `, [candidateId, jobId, resumeFileId, cvFileId, JSON.stringify(parsedChatAnswers), JSON.stringify(parsedFormAnswers)])
  
  const applicationId = appRes.rows[0].id
  
  res.json({ success: true, applicationId, candidateId })
  
  // Background processing
  try {
    // Generate Summary
    const summary = await generateApplicationSummary(resumeText, cvText, parsedChatAnswers, name)
    await query(`INSERT INTO candidate_summaries (candidate_id, application_id, summary_text) VALUES ($1, $2, $3)`, [candidateId, applicationId, summary])
    
    // Generate Behavioral Questions
    // Using empty string for valuesText temporarily, should ideally come from hiring_policies
    const questions = await generateBehavioralQuestions(resumeText, cvText, '', name)
    for (let q of questions) {
      await query(`INSERT INTO generated_behavioral_questions (candidate_id, application_id, question) VALUES ($1, $2, $3)`, [candidateId, applicationId, q])
    }
    
  } catch (err) {
    console.error('Background processing failed', err)
  }
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
