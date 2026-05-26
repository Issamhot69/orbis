import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const channels: any[] = []
const messages: any[] = []

// ─── Channels ────────────────────────────────
router.post('/channels', (req, res) => {
  const { name, orgId, type = 'public', members = [] } = req.body
  if (!name || !orgId) return res.status(400).json({ error: 'name and orgId required' })
  const channel = {
    id:        crypto.randomUUID(),
    name,
    orgId,
    type,
    members:   [...members, (req as any).userId],
    createdBy: (req as any).userId,
    createdAt: new Date(),
  }
  channels.push(channel)
  res.status(201).json({ channel })
})

router.get('/channels', (req, res) => {
  const userId = (req as any).userId
  const { orgId } = req.query
  let list = channels.filter(c => c.members.includes(userId))
  if (orgId) list = list.filter(c => c.orgId === orgId)
  res.json({ channels: list })
})

router.get('/channels/:channelId', (req, res) => {
  const channel = channels.find(c => c.id === req.params.channelId)
  if (!channel) return res.status(404).json({ error: 'Channel not found' })
  res.json({ channel })
})

// ─── Messages ────────────────────────────────
router.post('/channels/:channelId/messages', (req, res) => {
  const { content, type = 'text', attachments = [] } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  const channel = channels.find(c => c.id === req.params.channelId)
  if (!channel) return res.status(404).json({ error: 'Channel not found' })

  const message = {
    id:          crypto.randomUUID(),
    channelId:   req.params.channelId,
    userId:      (req as any).userId,
    content,
    type,
    attachments,
    reactions:   {},
    editedAt:    null,
    createdAt:   new Date(),
  }
  messages.push(message)
  res.status(201).json({ message })
})

router.get('/channels/:channelId/messages', (req, res) => {
  const { limit = 50, before } = req.query
  let list = messages.filter(m => m.channelId === req.params.channelId)
  if (before) list = list.filter(m => new Date(m.createdAt) < new Date(before as string))
  list = list.slice(-Number(limit))
  res.json({ messages: list, total: list.length })
})

router.patch('/channels/:channelId/messages/:messageId', (req, res) => {
  const msg = messages.find(m => m.id === req.params.messageId && m.userId === (req as any).userId)
  if (!msg) return res.status(404).json({ error: 'Message not found or not yours' })
  msg.content  = req.body.content || msg.content
  msg.editedAt = new Date()
  res.json({ message: msg })
})

router.delete('/channels/:channelId/messages/:messageId', (req, res) => {
  const idx = messages.findIndex(m => m.id === req.params.messageId && m.userId === (req as any).userId)
  if (idx === -1) return res.status(404).json({ error: 'Message not found or not yours' })
  messages.splice(idx, 1)
  res.json({ success: true })
})

// ─── Reactions ───────────────────────────────
router.post('/channels/:channelId/messages/:messageId/reactions', (req, res) => {
  const { emoji } = req.body
  const msg = messages.find(m => m.id === req.params.messageId)
  if (!msg) return res.status(404).json({ error: 'Message not found' })
  if (!msg.reactions[emoji]) msg.reactions[emoji] = []
  const userId = (req as any).userId
  if (!msg.reactions[emoji].includes(userId)) {
    msg.reactions[emoji].push(userId)
  }
  res.json({ message: msg })
})

// ─── Direct Messages ─────────────────────────
const dmThreads: any[] = []
const dmMessages: any[] = []

router.post('/dm', (req, res) => {
  const { toUserId } = req.body
  const fromUserId = (req as any).userId
  if (!toUserId) return res.status(400).json({ error: 'toUserId required' })
  let thread = dmThreads.find(t =>
    t.members.includes(fromUserId) && t.members.includes(toUserId)
  )
  if (!thread) {
    thread = { id: crypto.randomUUID(), members: [fromUserId, toUserId], createdAt: new Date() }
    dmThreads.push(thread)
  }
  res.json({ thread })
})

router.post('/dm/:threadId/messages', (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })
  const msg = {
    id: crypto.randomUUID(), threadId: req.params.threadId,
    userId: (req as any).userId, content, createdAt: new Date(),
  }
  dmMessages.push(msg)
  res.status(201).json({ message: msg })
})

router.get('/dm/:threadId/messages', (req, res) => {
  const list = dmMessages.filter(m => m.threadId === req.params.threadId)
  res.json({ messages: list })
})

export default router
