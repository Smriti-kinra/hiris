const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

/**
 * Express middleware — verifies the httpOnly JWT cookie and loads current
 * role permissions from the database. The token only identifies the user;
 * RBAC state is always read fresh so role edits take effect immediately.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers?.authorization
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) token = req.cookies?.hiris_token
  if (!token) return res.status(401).json({ error: 'Not authenticated.' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const { rows } = await query(
      `SELECT
         u.id AS user_id, u.name, u.email, u.role, u.portal, u.org_id, u.role_id, u.title,
         r.name AS role_name, r.permissions, r.visible_stages, r.landing_portal, r.home_path
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id AND r.org_id = u.org_id
       WHERE u.id = $1`,
      [payload.userId]
    )

    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'User not found.' })
    }

    req.currentUser = {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleId: user.role_id,
      roleName: user.role_name,
      portal: user.portal || user.landing_portal,
      orgId: user.org_id,
      title: user.title,
      permissions: user.permissions || {},
      visibleStages: user.visible_stages || [],
      homePath: user.home_path || `/${user.portal || user.landing_portal || 'hiring'}`,
    }
    next()
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[auth] Auth check failed:', err.message)
    }
    return res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}

function hasPermission(user, permKey) {
  const perms = user?.permissions || {}
  return !!(perms[permKey] || perms.is_admin)
}

/**
 * Express middleware — verifies the user has a specific permission.
 * MUST be used after requireAuth.
 */
function requirePermission(permKey) {
  return (req, res, next) => {
    if (hasPermission(req.currentUser, permKey)) return next()
    return res.status(403).json({ error: 'Access denied: missing permission ' + permKey })
  }
}

function requireAnyPermission(permKeys) {
  return (req, res, next) => {
    if (permKeys.some(key => hasPermission(req.currentUser, key))) return next()
    return res.status(403).json({ error: 'Access denied: missing one of ' + permKeys.join(', ') })
  }
}

module.exports = { requireAuth, requirePermission, requireAnyPermission, hasPermission }
