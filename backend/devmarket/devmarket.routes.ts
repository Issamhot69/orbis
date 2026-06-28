import { Router } from 'express'
import { authenticate } from '../auth/middleware/authenticate'
import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

const router = Router()
router.use(authenticate)

router.get('/products', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM dev_products ORDER BY installs DESC`)
    res.json({ products: result.rows })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

router.post('/products', async (req, res) => {
  try {
    const { name, type, category, price, billing, description, tags, free, freeLabel, color, developer } = req.body
    const result = await db.execute(sql`INSERT INTO dev_products (name, type, category, price, billing, description, free, free_label, color, developer, user_id) VALUES (${name}, ${type}, ${category}, ${price||0}, ${billing||'month'}, ${description}, ${free||false}, ${freeLabel||''}, ${color||'#1a6fff'}, ${developer||'Developer'}, ${(req as any).userId}) RETURNING *`)
    res.status(201).json({ product: result.rows[0] })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

export default router
