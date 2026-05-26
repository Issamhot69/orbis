import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const roles: any[] = [
  { id: '1', name: 'owner',  permissions: ['*'] },
  { id: '2', name: 'admin',  permissions: ['read', 'write', 'invite'] },
  { id: '3', name: 'member', permissions: ['read', 'write'] },
  { id: '4', name: 'guest',  permissions: ['read'] },
]

router.get('/', (req, res) => {
  res.json({ roles })
})

router.get('/:roleId', (req, res) => {
  const role = roles.find(r => r.id === req.params.roleId)
  if (!role) return res.status(404).json({ error: 'Role not found' })
  res.json({ role })
})

export default router
