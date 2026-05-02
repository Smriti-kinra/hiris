const express = require('express')
const router  = express.Router()
const { query }       = require('../config/db')
const { requireAuth } = require('../middleware/auth')

router.get('/chro/pipeline', requireAuth, async (req, res) => {
  const [open, offers, hires, avg] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM jobs WHERE status='active'`),
    query(`SELECT COUNT(*)::int AS count FROM applications WHERE stage='offered'`),
    query(`SELECT COUNT(*)::int AS count FROM applications WHERE stage='accepted'`),
    query(`SELECT ROUND(AVG(EXTRACT(DAY FROM NOW()-submitted_at)),0) AS days FROM headcount_requests WHERE status='approved'`),
  ])
  res.json({
    total_open_positions:  open.rows[0].count,
    offers_pending:        offers.rows[0].count,
    hires_this_month:      hires.rows[0].count,
    avg_time_to_hire_days: parseInt(avg.rows[0].days) || 0,
  })
})

router.get('/chro/team', requireAuth, async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.name, u.role, u.title, u.email,
      COUNT(hr.id)::int AS active_requests
    FROM users u
    LEFT JOIN headcount_requests hr ON hr.requested_by=u.id AND hr.status IN ('pending','under_review')
    WHERE u.portal IN ('hiring','faculty')
    GROUP BY u.id,u.name,u.role,u.title,u.email
    ORDER BY u.role, u.name`)
  res.json(rows)
})

module.exports = router
