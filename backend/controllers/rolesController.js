const { query } = require('../config/db')

async function getCurrentOrgId(req, res) {
  const userRes = await query('SELECT org_id FROM users WHERE id = $1', [req.currentUser.userId])
  const orgId = userRes.rows[0]?.org_id

  if (!orgId) {
    res.status(400).json({ error: 'User does not belong to an organisation.' })
    return null
  }

  return orgId
}

async function listRoles(req, res) {
  try {
    const orgId = await getCurrentOrgId(req, res)
    if (!orgId) return

    const { rows } = await query('SELECT * FROM roles WHERE org_id = $1 ORDER BY id ASC', [orgId])
    res.json(rows)
  } catch (error) {
    console.error('[roles] Error fetching roles:', error)
    res.status(500).json({ error: 'Failed to fetch roles.' })
  }
}

async function createRole(req, res) {
  const { name, permissions } = req.body
  if (!name) return res.status(400).json({ error: 'Role name is required.' })

  try {
    const orgId = await getCurrentOrgId(req, res)
    if (!orgId) return

    const { rows } = await query(
      `INSERT INTO roles (org_id, name, permissions) VALUES ($1, $2, $3) RETURNING *`,
      [orgId, name, permissions || {}]
    )
    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A role with this name already exists in your organisation.' })
    }
    console.error('[roles] Error creating role:', error)
    res.status(500).json({ error: 'Failed to create role.' })
  }
}

async function updateRole(req, res) {
  const { id } = req.params
  const { name, permissions } = req.body

  try {
    const orgId = await getCurrentOrgId(req, res)
    if (!orgId) return

    const { rows } = await query(
      `UPDATE roles SET name = COALESCE($1, name), permissions = COALESCE($2, permissions)
       WHERE id = $3 AND org_id = $4 RETURNING *`,
      [name, permissions, id, orgId]
    )

    if (rows.length === 0) return res.status(404).json({ error: 'Role not found.' })
    res.json(rows[0])
  } catch (error) {
    console.error('[roles] Error updating role:', error)
    res.status(500).json({ error: 'Failed to update role.' })
  }
}

async function deleteRole(req, res) {
  const { id } = req.params

  try {
    const orgId = await getCurrentOrgId(req, res)
    if (!orgId) return

    const usersRes = await query('SELECT COUNT(*) FROM users WHERE role_id = $1', [id])
    if (parseInt(usersRes.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete a role that is assigned to active users.' })
    }

    const { rowCount } = await query('DELETE FROM roles WHERE id = $1 AND org_id = $2', [id, orgId])
    if (rowCount === 0) return res.status(404).json({ error: 'Role not found.' })

    res.json({ success: true })
  } catch (error) {
    console.error('[roles] Error deleting role:', error)
    res.status(500).json({ error: 'Failed to delete role.' })
  }
}

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
}
