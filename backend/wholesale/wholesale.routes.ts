import { Router } from 'express'
import { authenticate } from '../auth/middleware/authenticate'
import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

const router = Router()
router.use(authenticate)

router.get('/products', async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM wholesale_products ORDER BY trust DESC`)
    res.json({ products: result.rows })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

router.post('/products', async (req, res) => {
  try {
    const { name, category, country, price, unit, minOrder, stock, seller, image, description } = req.body
    const result = await db.execute(sql`INSERT INTO wholesale_products (name, category, country, price, unit, min_order, stock, seller, image, description, user_id) VALUES (${name}, ${category}, ${country}, ${price}, ${unit}, ${minOrder||1}, ${stock||0}, ${seller}, ${image||'📦'}, ${description}, ${(req as any).userId}) RETURNING *`)
    res.status(201).json({ product: result.rows[0] })
  } catch(err: any) { res.status(500).json({ error: err.message }) }
})

export default router
