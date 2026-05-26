import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const notifications: any[] = []

export function notify(userId: string, type: string, message: string, data?: any) {
  notifications.push({
    id:        crypto.randomUUID(),
    userId,
    type,
    message,
    data,
    read:      false,
    createdAt: new Date(),
  })
}

router.get('/', (req, res) => {
  const userId = (req as any).userId
  const myNotifs = notifications.filter(n => n.userId === userId).reverse()
  res.json({ notifications: myNotifs, unread: myNotifs.filter(n => !n.read).length })
})

router.patch('/:id/read', (req, res) => {
  const notif = notifications.find(n => n.id === req.params.id)
  if (!notif) return res.status(404).json({ error: 'Not found' })
  notif.read = true
  res.json({ notification: notif })
})

export default router
