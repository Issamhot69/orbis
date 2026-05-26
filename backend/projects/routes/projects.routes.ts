import { Router } from 'express'
import { db } from '../../lib/db'
import { projects, tasks } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { name, orgId, description, status = 'active' } = req.body
    if (!name || !orgId) return res.status(400).json({ error: 'name and orgId required' })
    const [project] = await db.insert(projects).values({
      name, orgId, description, status, createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ project })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { orgId } = req.query
    let list = await db.select().from(projects)
    if (orgId) list = list.filter(p => p.orgId === orgId)
    res.json({ projects: list })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/:projectId', async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, req.params.projectId)).limit(1)
    if (!project) return res.status(404).json({ error: 'Not found' })
    const taskList = await db.select().from(tasks).where(eq(tasks.projectId, req.params.projectId))
    res.json({ project, tasks: taskList })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.post('/:projectId/tasks', async (req, res) => {
  try {
    const { title, description, priority = 'medium', status = 'todo' } = req.body
    if (!title) return res.status(400).json({ error: 'title required' })
    const [task] = await db.insert(tasks).values({
      projectId: req.params.projectId, title, description,
      priority, status, createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ task })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/:projectId/tasks', async (req, res) => {
  try {
    const list = await db.select().from(tasks).where(eq(tasks.projectId, req.params.projectId))
    res.json({ tasks: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.patch('/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const { title, description, status, priority } = req.body
    const updates: any = { updatedAt: new Date() }
    if (title)       updates.title       = title
    if (description) updates.description = description
    if (status)      updates.status      = status
    if (priority)    updates.priority    = priority
    const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, req.params.taskId)).returning()
    res.json({ task })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

export default router
