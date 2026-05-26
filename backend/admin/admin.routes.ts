import { Router } from 'express'
import { authenticate } from '../auth/middleware/authenticate'
import { getSecurityStats, unbanIP, banIP } from '../lib/security'
import { db } from '../lib/db'
import { users, organizations, projects, listings, contracts, opportunities, payments } from '../db/schema'
import { sql } from 'drizzle-orm'

const router = Router()
router.use(authenticate)

router.get('/stats', async (req, res) => {
  try {
    const [u, o, p, l, c, op, pay] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(organizations),
      db.select({ count: sql<number>`count(*)` }).from(projects),
      db.select({ count: sql<number>`count(*)` }).from(listings),
      db.select({ count: sql<number>`count(*)` }).from(contracts),
      db.select({ count: sql<number>`count(*)` }).from(opportunities),
      db.select({ count: sql<number>`count(*)` }).from(payments),
    ])
    res.json({
      stats: {
        users: Number(u[0]?.count||0), organizations: Number(o[0]?.count||0),
        projects: Number(p[0]?.count||0), listings: Number(l[0]?.count||0),
        contracts: Number(c[0]?.count||0), opportunities: Number(op[0]?.count||0),
        payments: Number(pay[0]?.count||0),
      },
      security: getSecurityStats(),
    })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/users', async (req, res) => {
  try {
    const list = await db.select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, isVerified: users.isVerified, isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt }).from(users).limit(100)
    res.json({ users: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/security', (req, res) => res.json(getSecurityStats()))

router.post('/security/ban', (req, res) => {
  const { ip } = req.body
  if (!ip) return res.status(400).json({ error: 'ip required' })
  res.json(banIP(ip))
})

router.post('/security/unban', (req, res) => {
  const { ip } = req.body
  if (!ip) return res.status(400).json({ error: 'ip required' })
  res.json(unbanIP(ip))
})

export default router
