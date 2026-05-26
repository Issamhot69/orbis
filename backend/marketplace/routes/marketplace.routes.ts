import { Router } from 'express'
import { db } from '../../lib/db'
import { listings } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const CATEGORIES = [
  { id:'1', name:'Technology', slug:'technology' },
  { id:'2', name:'Marketing',  slug:'marketing' },
  { id:'3', name:'Finance',    slug:'finance' },
  { id:'4', name:'Legal',      slug:'legal' },
  { id:'5', name:'Design',     slug:'design' },
  { id:'6', name:'Consulting', slug:'consulting' },
  { id:'7', name:'Manufacturing', slug:'manufacturing' },
  { id:'8', name:'Logistics',  slug:'logistics' },
]

router.get('/categories', (req, res) => res.json({ categories: CATEGORIES }))

router.post('/listings', async (req, res) => {
  try {
    const { orgId, title, description, categoryId, type, price, currency = 'USD', priceType, remote = true } = req.body
    if (!orgId || !title || !description || !categoryId || !type)
      return res.status(400).json({ error: 'orgId, title, description, categoryId, type required' })
    const [listing] = await db.insert(listings).values({
      orgId, title, description, categoryId, type,
      price, currency, priceType, remote, createdBy: (req as any).userId
    }).returning()
    res.status(201).json({ listing })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/listings', async (req, res) => {
  try {
    const { search, categoryId, type } = req.query
    let list = await db.select().from(listings).where(eq(listings.status, 'active'))
    if (categoryId) list = list.filter(l => l.categoryId === categoryId)
    if (type)       list = list.filter(l => l.type === type)
    if (search) {
      const q = (search as string).toLowerCase()
      list = list.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q))
    }
    res.json({ listings: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/listings/:listingId', async (req, res) => {
  try {
    const [listing] = await db.select().from(listings).where(eq(listings.id, req.params.listingId)).limit(1)
    if (!listing) return res.status(404).json({ error: 'Not found' })
    await db.update(listings).set({ views: (listing.views || 0) + 1 }).where(eq(listings.id, req.params.listingId))
    res.json({ listing })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

router.get('/my-listings', async (req, res) => {
  try {
    const list = await db.select().from(listings).where(eq(listings.createdBy, (req as any).userId))
    res.json({ listings: list, total: list.length })
  } catch (err: any) { res.status(500).json({ error: err.message }) }
})

export default router
