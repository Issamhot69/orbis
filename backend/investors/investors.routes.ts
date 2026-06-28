import { Router } from 'express'
import { authenticate } from '../auth/middleware/authenticate'
import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

const router = Router()
router.use(authenticate)

router.get('/investors', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM investors ORDER BY trust DESC`)
    res.json({ investors: result.rows })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/startups', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM startups ORDER BY trust DESC`)
    res.json({ startups: result.rows })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

router.post('/investors', async (req, res) => {
  try {
    const { name, country, type, minTicket, maxTicket, bio, color } = req.body
    const result = await db.execute(sql`INSERT INTO investors (name, country, type, min_ticket, max_ticket, bio, color, user_id) VALUES (${name}, ${country}, ${type}, ${minTicket||100000}, ${maxTicket||1000000}, ${bio}, ${color||'#1a6fff'}, ${(req as any).userId}) RETURNING *`)
    res.status(201).json({ investor: result.rows[0] })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

router.post('/startups', async (req, res) => {
  try {
    const { name, country, stage, sector, seeking, valuation, traction, description, color } = req.body
    const result = await db.execute(sql`INSERT INTO startups (name, country, stage, sector, seeking, valuation, traction, description, color, user_id) VALUES (${name}, ${country}, ${stage}, ${sector}, ${seeking}, ${valuation}, ${traction}, ${description}, ${color||'#1a6fff'}, ${(req as any).userId}) RETURNING *`)
    res.status(201).json({ startup: result.rows[0] })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

export default router
