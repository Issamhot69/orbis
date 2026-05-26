import { Router } from 'express'
import { db } from '../../lib/db'
import { contracts } from '../../db/schema'
import { eq, or } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { title, fromOrgId, toOrgId, amount, currency = 'USD', description } = req.body
    if (!title || !fromOrgId || !toOrgId || !amount)
      return res.status(400).json({ error: 'title, fromOrgId, toOrgId, amount required' })
    const [contract] = await db.insert(contracts).values({
      title, fromOrgId, toOrgId, amount, currency, description,
      createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ contract })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const { orgId } = req.query
    let list = await db.select().from(contracts)
    if (orgId) list = list.filter(c => c.fromOrgId === orgId || c.toOrgId === orgId)
    res.json({ contracts: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/:contractId', async (req, res) => {
  try {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, req.params.contractId)).limit(1)
    if (!contract) return res.status(404).json({ error: 'Not found' })
    res.json({ contract })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.patch('/:contractId/send', async (req, res) => {
  try {
    const [contract] = await db.update(contracts).set({ status: 'sent', updatedAt: new Date() }).where(eq(contracts.id, req.params.contractId)).returning()
    res.json({ contract })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.post('/:contractId/sign', async (req, res) => {
  try {
    const [contract] = await db.update(contracts).set({ status: 'signed', updatedAt: new Date() }).where(eq(contracts.id, req.params.contractId)).returning()
    res.json({ contract, signature: { signedAt: new Date() } })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.patch('/:contractId/status', async (req, res) => {
  try {
    const { status } = req.body
    const [contract] = await db.update(contracts).set({ status, updatedAt: new Date() }).where(eq(contracts.id, req.params.contractId)).returning()
    res.json({ contract })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

export default router
