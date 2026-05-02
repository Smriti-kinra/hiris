const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const {
  login,
  getMe,
  logout,
  registerOrg,
} = require('../controllers/authController')

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate with email + password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Authenticated; sets httpOnly JWT cookie
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login)

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Return the currently authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Authenticated user object
 *       401:
 *         description: Not authenticated
 */
router.get('/me', requireAuth, getMe)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Clear the auth cookie and end the session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', logout)

/**
 * @swagger
 * /api/auth/register-org:
 *   post:
 *     summary: Register a new organization and invite users
 *     tags: [Auth]
 */
router.post('/register-org', registerOrg)

module.exports = router
