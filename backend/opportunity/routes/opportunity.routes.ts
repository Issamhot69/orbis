import { Router } from 'express'
import { db } from '../../lib/db'
import { opportunities } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { orgId, title, description, type, value, currency = 'USD', probability = 50 } = req.body
    if (!orgId || !title) return res.status(400).json({ error: 'orgId and title required' })
    const [opportunity] = await db.insert(opportunities).values({
      orgId, title, description, type, value, currency,
      probability, createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ opportunity })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const { orgId, stage } = req.query
    let list = await db.select().from(opportunities)
    if (orgId) list = list.filter(o => o.orgId === orgId)
    if (stage) list = list.filter(o => o.stage === stage)
    const totalValue    = list.reduce((s, o) => s + (Number(o.value) || 0), 0)
    const weightedValue = list.reduce((s, o) => s + ((Number(o.value) || 0) * (o.probability || 50) / 100), 0)
    res.json({ opportunities: list, total: list.length, totalValue, weightedValue })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.patch('/:opportunityId/stage', async (req, res) => {
  try {
    const { stage } = req.body
    const [opportunity] = await db.update(opportunities).set({ stage, updatedAt: new Date() }).where(eq(opportunities.id, req.params.opportunityId)).returning()
    res.json({ opportunity })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/pipeline/:orgId', async (req, res) => {
  try {
    const stages = ['identified', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    const list = await db.select().from(opportunities).where(eq(opportunities.orgId, req.params.orgId))
    const pipeline = stages.map(stage => ({
      stage,
      count: list.filter(o => o.stage === stage).length,
      value: list.filter(o => o.stage === stage).reduce((s, o) => s + (Number(o.value) || 0), 0),
    }))
    res.json({ pipeline })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

export default router
