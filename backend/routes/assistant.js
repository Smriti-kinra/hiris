const express = require('express')
const router  = express.Router()

/**
 * @swagger
 * /api/assistant/suggest:
 *   post:
 *     summary: Get AI-assisted JD or question suggestions
 *     tags: [Assistant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: Suggestion payload
 *       501:
 *         description: Not yet implemented
 */
router.post('/assistant/suggest', (req, res) => {
  // Phase 1 stub — AI integration planned for a later phase
  res.status(501).json({
    error:   'Not implemented',
    message: 'AI assistant integration is planned for a future release.',
  })
})

module.exports = router
