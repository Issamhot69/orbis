import { Router } from 'express'
import { db } from '../../lib/db'
import { payments } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { fromOrgId, toOrgId, amount, currency = 'USD', method, description, contractId } = req.body
    if (!fromOrgId || !toOrgId || !amount)
      return res.status(400).json({ error: 'fromOrgId, toOrgId, amount required' })
    const [payment] = await db.insert(payments).values({
      fromOrgId, toOrgId, amount, currency, method, contractId,
      createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ payment })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const { orgId } = req.query
    let list = await db.select().from(payments)
    if (orgId) list = list.filter(p => p.fromOrgId === orgId || p.toOrgId === orgId)
    res.json({ payments: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.patch('/:paymentId/status', async (req, res) => {
  try {
    const { status } = req.body
    const [payment] = await db.update(payments).set({ status, updatedAt: new Date() }).where(eq(payments.id, req.params.paymentId)).returning()
    res.json({ payment })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/invoices', (req, res) => res.json({ invoices: [] }))
router.post('/invoices', (req, res) => res.json({ invoice: { id: crypto.randomUUID(), ...req.body, createdAt: new Date() } }))

export default router
