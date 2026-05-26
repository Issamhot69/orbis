import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const PERMISSIONS = [
  'read', 'write', 'delete',
  'invite', 'manage_roles',
  'manage_billing', 'manage_integrations',
  'view_audit', 'export_data', '*'
]

router.get('/', (req, res) => {
  res.json({ permissions: PERMISSIONS })
})

export default router
