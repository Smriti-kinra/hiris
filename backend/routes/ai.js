const express = require('express')
const router  = express.Router()

/**
 * @swagger
 * /api/ai/score:
 *   post:
 *     summary: AI-powered candidate scoring
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidate_id:
 *                 type: string
 *               resume_text:
 *                 type: string
 *               job_description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Scoring result
 *       501:
 *         description: Not yet implemented
 */
router.post('/score', (req, res) => {
  // Phase 1 stub — AI scoring integration planned for a later phase
  res.status(501).json({
    error:   'Not implemented',
    message: 'AI scoring is planned for a future release.',
  })
})

/**
 * @swagger
 * /api/ai/summarize:
 *   post:
 *     summary: Summarize a candidate's profile or interview transcript
 *     tags: [AI]
 *     responses:
 *       501:
 *         description: Not yet implemented
 */
router.post('/summarize', (req, res) => {
  res.status(501).json({
    error:   'Not implemented',
    message: 'AI summarization is planned for a future release.',
  })
})

module.exports = router
