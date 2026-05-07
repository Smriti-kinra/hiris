const express = require('express')
const router = express.Router()
const { requireAuth, requirePermission } = require('../middleware/auth')
const {
  listRoleConfig,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/rolesController')

router.get('/config', listRoleConfig)

router.use(requireAuth)
router.use(requirePermission('can_manage_roles'))

router.get('/', listRoles)
router.post('/', createRole)
router.put('/:id', updateRole)
router.delete('/:id', deleteRole)

module.exports = router
