const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, portal: user.portal, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.portal, u.title, u.password_hash, r.permissions
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE LOWER(u.email) = LOWER($1) AND u.portal IS NOT NULL`,
    [email.trim()]
  )

  const user = rows[0]
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  if (!user.password_hash) {
    return res.status(401).json({ error: 'Account not activated. Contact your administrator.' })
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const token = issueToken(user)
  res.cookie('hiris_token', token, COOKIE_OPTS)

  const { password_hash, ...safeUser } = user
  res.json({ user: safeUser })
}

async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.portal, u.title, r.permissions
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [req.currentUser.userId]
  )

  if (!rows[0]) return res.status(401).json({ error: 'User not found.' })
  res.json({ user: rows[0] })
}

function logout(req, res) {
  res.clearCookie('hiris_token', { httpOnly: true, sameSite: 'lax' })
  res.json({ ok: true })
}

async function registerOrg(req, res) {
  // Guard: if REGISTRATION_SECRET is configured, the caller must supply it.
  // This prevents unauthenticated creation of admin accounts in production.
  const requiredSecret = process.env.REGISTRATION_SECRET
  if (requiredSecret) {
    const provided = req.body?.registration_secret
    if (!provided || provided !== requiredSecret) {
      return res.status(403).json({
        error: 'Registration is restricted. A valid registration_secret is required.',
      })
    }
  }

  const { org, roles, users } = req.body

  if (!org?.name || !users || users.length === 0) {
    return res.status(400).json({ error: 'Organisation name and at least one user are required.' })
  }

  try {
    const orgRes = await query(
      `INSERT INTO orgs (name, industry, size) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET industry = $2, size = $3
       RETURNING id`,
      [org.name, org.industry, org.size]
    )
    const orgId = orgRes.rows[0].id

    const roleMap = {}
    if (roles && roles.length > 0) {
      for (const r of roles) {
        const roleRes = await query(
          `INSERT INTO roles (org_id, name, permissions) VALUES ($1, $2, $3)
           ON CONFLICT (org_id, name) DO UPDATE SET permissions = $3
           RETURNING id`,
          [orgId, r.label, r.perms || {}]
        )
        roleMap[r.key] = roleRes.rows[0].id
      }
    }

    let createdAdmin = null

    for (const u of users) {
      if (!u.email || !u.password) continue

      const hash = await bcrypt.hash(u.password, 10)
      const rawRoleKey = u.role === 'hiring_manager'
        ? 'hiring-manager'
        : u.role === 'faculty'
          ? 'department-leader'
          : 'chro'
      const roleId = roleMap[rawRoleKey] || null

      const { rows } = await query(
        `INSERT INTO users (name, email, role, portal, password_hash, org, org_id, role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO UPDATE
         SET name = $1, role = $3, portal = $4, password_hash = $5, org = $6, org_id = $7, role_id = $8
         RETURNING id, name, email, role, portal, title, org`,
        [u.name, u.email, u.role, u.portal, hash, org.name, orgId, roleId]
      )

      if (!createdAdmin && rows.length > 0) {
        createdAdmin = rows[0]
      }
    }

    if (!createdAdmin) {
      return res.status(500).json({ error: 'Failed to create the primary user account.' })
    }

    const token = issueToken(createdAdmin)
    res.cookie('hiris_token', token, COOKIE_OPTS)

    res.status(201).json({ user: createdAdmin })
  } catch (err) {
    console.error('[auth/register-org] Error:', err)
    res.status(500).json({ error: 'Internal server error during registration.' })
  }
}

module.exports = {
  login,
  getMe,
  logout,
  registerOrg,
}
