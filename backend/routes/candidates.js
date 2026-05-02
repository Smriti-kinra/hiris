const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth } = require('../middleware/auth')

/**
 * @swagger
 * /api/candidates:
 *   get:
 *     summary: List all candidates with their current pipeline stage
 *     tags: [Candidates]
 *     responses:
 *       200:
 *         description: Array of candidate objects
 */
router.get('/candidates', requireAuth, async (req, res) => {
  const { rows } = await query(`
    SELECT
      c.id::text                      AS id,
      c.name,
      c.email,
      j.title                         AS role,
      COALESCE(c.source, 'Direct')    AS source,
      a.applied_at,
      CASE a.stage
        WHEN 'applied'   THEN 'Applied'
        WHEN 'screening' THEN 'Screening'
        WHEN 'interview' THEN 'Interview'
        WHEN 'offered'   THEN 'Offer'
        WHEN 'accepted'  THEN 'Hired'
        WHEN 'rejected'  THEN 'Rejected'
        ELSE 'Applied'
      END                             AS stage,
      c.ai_score                      AS score
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id
    LEFT JOIN jobs         j ON j.id = a.job_id
    ORDER BY a.applied_at DESC NULLS LAST
  `)
  res.json(rows)
})

/**
 * @swagger
 * /api/candidates/{id}:
 *   get:
 *     summary: Get a single candidate with full detail
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Candidate detail object
 *       404:
 *         description: Not found
 */
router.get('/candidates/:id', requireAuth, async (req, res) => {
  const { rows } = await query(`
    SELECT
      c.id::text,
      c.name,
      c.email,
      c.phone,
      c.resume_url,
      COALESCE(c.source, 'Direct')    AS source,
      c.ai_score                      AS score,
      j.title                         AS role,
      j.department,
      CASE a.stage
        WHEN 'applied'   THEN 'Applied'
        WHEN 'screening' THEN 'Screening'
        WHEN 'interview' THEN 'Interview'
        WHEN 'offered'   THEN 'Offer'
        WHEN 'accepted'  THEN 'Hired'
        WHEN 'rejected'  THEN 'Rejected'
        ELSE 'Applied'
      END                             AS stage,
      a.applied_at,
      a.notes
    FROM candidates c
    LEFT JOIN applications a ON a.candidate_id = c.id
    LEFT JOIN jobs         j ON j.id = a.job_id
    WHERE c.id = $1
  `, [req.params.id])

  if (!rows[0]) return res.status(404).json({ error: 'Candidate not found.' })
  res.json(rows[0])
})

module.exports = router
