import { Router } from 'express'
import { db } from '../../lib/db'
import { memories } from '../../db/schema'
import { eq, ilike, or } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { orgId, type, title, content, source } = req.body
    if (!orgId || !title || !content) return res.status(400).json({ error: 'orgId, title, content required' })
    const [memory] = await db.insert(memories).values({
      orgId, type, title, content, source, createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ memory })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const { orgId, type, search } = req.query
    let list = await db.select().from(memories)
    if (orgId)  list = list.filter(m => m.orgId === orgId)
    if (type)   list = list.filter(m => m.type === type)
    if (search) {
      const q = (search as string).toLowerCase()
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q))
    }
    res.json({ memories: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.delete('/:memoryId', async (req, res) => {
  try {
    await db.delete(memories).where(eq(memories.id, req.params.memoryId))
    res.json({ success: true })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

export default router
