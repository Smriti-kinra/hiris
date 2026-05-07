const { query } = require('../config/db')
const {
  PERMISSION_GROUPS,
  PIPELINE_STAGES,
  ROLE_TEMPLATES,
  normalizePermissions,
  normalizeVisibleStages,
  slugifyRoleName,
} = require('../config/permissions')

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

    const { rows } = await query(
      `SELECT r.*,
        COUNT(u.id)::int AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       WHERE r.org_id = $1
       GROUP BY r.id
       ORDER BY r.is_system DESC, r.id ASC`,
      [orgId]
    )
    res.json(rows)
  } catch (error) {
    console.error('[roles] Error fetching roles:', error)
    res.status(500).json({ error: 'Failed to fetch roles.' })
  }
}

function listRoleConfig(_req, res) {
  res.json({
    permission_groups: PERMISSION_GROUPS,
    pipeline_stages: PIPELINE_STAGES,
    role_templates: ROLE_TEMPLATES,
  })
}

async function auditRoleChange({ orgId, roleId, actorUserId, action, before, after }) {
  await query(
    `INSERT INTO role_audit_logs (org_id, role_id, actor_user_id, action, before, after)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orgId, roleId, actorUserId, action, before || null, after || null]
  ).catch(error => {
    console.error('[roles] Failed to write audit log:', error)
  })
}

async function createRole(req, res) {
  const {
    name,
    description,
    permissions,
    visible_stages,
    permission_groups,
    landing_portal,
    home_path,
    template_key,
  } = req.body
  if (!name) return res.status(400).json({ error: 'Role name is required.' })

  try {
    const orgId = await getCurrentOrgId(req, res)
    if (!orgId) return

    const { rows } = await query(
      `INSERT INTO roles (
         org_id, name, description, permissions, visible_stages, permission_groups,
         template_key, is_system, landing_portal, home_path
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9)
       RETURNING *`,
      [
        orgId,
        name.trim(),
        description || null,
        normalizePermissions(permissions || {}),
        normalizeVisibleStages(visible_stages || []),
        JSON.stringify(permission_groups || []),
        template_key || slugifyRoleName(name),
        landing_portal || 'hiring',
        home_path || null,
      ]
    )
    await auditRoleChange({
      orgId,
      roleId: rows[0].id,
      actorUserId: req.currentUser.userId,
      action: 'create',
      after: rows[0],
    })
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
  const {
    name,
    description,
    permissions,
    visible_stages,
    permission_groups,
    landing_portal,
    home_path,
  } = req.body

  try {
    const orgId = await getCurrentOrgId(req, res)
    if (!orgId) return

    const before = await query('SELECT * FROM roles WHERE id = $1 AND org_id = $2', [id, orgId])
    if (before.rows.length === 0) return res.status(404).json({ error: 'Role not found.' })

    const { rows } = await query(
      `UPDATE roles
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           permissions = COALESCE($3, permissions),
           visible_stages = COALESCE($4, visible_stages),
           permission_groups = COALESCE($5, permission_groups),
           landing_portal = COALESCE($6, landing_portal),
           home_path = COALESCE($7, home_path),
           updated_at = NOW()
       WHERE id = $8 AND org_id = $9
       RETURNING *`,
      [
        name ? name.trim() : null,
        description ?? null,
        permissions ? normalizePermissions(permissions) : null,
        visible_stages ? normalizeVisibleStages(visible_stages) : null,
        permission_groups ? JSON.stringify(permission_groups) : null,
        landing_portal || null,
        home_path ?? null,
        id,
        orgId,
      ]
    )

    await auditRoleChange({
      orgId,
      roleId: rows[0].id,
      actorUserId: req.currentUser.userId,
      action: 'update',
      before: before.rows[0],
      after: rows[0],
    })
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

    const roleRes = await query('SELECT * FROM roles WHERE id = $1 AND org_id = $2', [id, orgId])
    if (roleRes.rows.length === 0) return res.status(404).json({ error: 'Role not found.' })
    if (roleRes.rows[0].is_system) {
      return res.status(400).json({ error: 'Default role templates cannot be deleted. You can edit their permissions instead.' })
    }

    const usersRes = await query('SELECT COUNT(*) FROM users WHERE role_id = $1', [id])
    if (parseInt(usersRes.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete a role that is assigned to active users.' })
    }

    await auditRoleChange({
      orgId,
      roleId: id,
      actorUserId: req.currentUser.userId,
      action: 'delete',
      before: roleRes.rows[0],
    })

    const { rowCount } = await query('DELETE FROM roles WHERE id = $1 AND org_id = $2', [id, orgId])
    if (rowCount === 0) return res.status(404).json({ error: 'Role not found.' })
    res.json({ success: true })
  } catch (error) {
    console.error('[roles] Error deleting role:', error)
    res.status(500).json({ error: 'Failed to delete role.' })
  }
}

module.exports = {
  listRoleConfig,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
}
