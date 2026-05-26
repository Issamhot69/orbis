import { Router } from 'express'
import { db } from '../../lib/db'
import { organizations, orgMembers } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'
import crypto from 'crypto'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { name, description, industry, size, website } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + crypto.randomBytes(3).toString('hex')
    const [org] = await db.insert(organizations).values({ name, slug, description, industry, size, website }).returning()
    await db.insert(orgMembers).values({ organizationId: org.id, userId: (req as any).userId, role: 'owner' })
    res.status(201).json({ organization: org })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId
    const memberships = await db
      .select({ org: organizations, role: orgMembers.role })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
      .where(eq(orgMembers.userId, userId))
    res.json({ organizations: memberships })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:orgId', async (req, res) => {
  try {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, req.params.orgId)).limit(1)
    if (!org) return res.status(404).json({ error: 'Not found' })
    const members = await db.select().from(orgMembers).where(eq(orgMembers.organizationId, req.params.orgId))
    res.json({ organization: org, members })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
