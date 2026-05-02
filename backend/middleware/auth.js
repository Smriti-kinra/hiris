const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

/**
 * Express middleware — verifies the httpOnly JWT cookie.
 * On success: attaches req.currentUser = { userId, portal, role }
 * On failure: returns 401.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.hiris_token
  if (!token) return res.status(401).json({ error: 'Not authenticated.' })

  try {
    req.currentUser = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.clearCookie('hiris_token')
    return res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}

/**
 * Express middleware — verifies the user has a specific permission.
 * MUST be used after requireAuth.
 */
function requirePermission(permKey) {
  return async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT r.permissions FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1`,
        [req.currentUser.userId]
      )
      
      const perms = rows[0]?.permissions || {}
      if (perms[permKey] || perms['is_admin']) {
        return next()
      }
      return res.status(403).json({ error: 'Access Denied: Missing permission ' + permKey })
    } catch (err) {
      console.error('[auth] Permission check failed:', err)
      return res.status(500).json({ error: 'Internal server error checking permissions.' })
    }
  }
}

module.exports = { requireAuth, requirePermission }
