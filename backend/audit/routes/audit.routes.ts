import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

export const auditLogs: any[] = []

export function log(userId: string, action: string, resource: string, detail?: any) {
  auditLogs.push({
    id:        crypto.randomUUID(),
    userId,
    action,
    resource,
    detail,
    createdAt: new Date(),
  })
}

router.get('/', (req, res) => {
  const logs = [...auditLogs].reverse().slice(0, 100)
  res.json({ logs, total: auditLogs.length })
})

export default router
