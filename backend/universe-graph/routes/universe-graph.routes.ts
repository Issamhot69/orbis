import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const nodes: any[]       = []
const connections: any[] = []
const clusters: any[]    = []

// ─── Add node (org in the graph) ─────────────
router.post('/nodes', (req, res) => {
  const { orgId, industry, size, location, tags = [] } = req.body
  if (!orgId) return res.status(400).json({ error: 'orgId required' })
  const existing = nodes.find(n => n.orgId === orgId)
  if (existing) return res.status(409).json({ error: 'Node already exists' })
  const node = {
    id:        crypto.randomUUID(),
    orgId,
    industry,
    size,
    location,
    tags,
    degree:    0,
    createdAt: new Date(),
  }
  nodes.push(node)
  res.status(201).json({ node })
})

// ─── Get graph ───────────────────────────────
router.get('/graph', (req, res) => {
  const { orgId, depth = 2 } = req.query
  if (orgId) {
    const centerNode = nodes.find(n => n.orgId === orgId)
    if (!centerNode) return res.status(404).json({ error: 'Node not found' })
    const directConnections = connections.filter(c => c.fromOrgId === orgId || c.toOrgId === orgId)
    const connectedOrgIds   = directConnections.map(c => c.fromOrgId === orgId ? c.toOrgId : c.fromOrgId)
    const connectedNodes    = nodes.filter(n => connectedOrgIds.includes(n.orgId))
    return res.json({
      center:      centerNode,
      nodes:       connectedNodes,
      connections: directConnections,
      totalNodes:  connectedNodes.length,
    })
  }
  res.json({ nodes, connections, totalNodes: nodes.length, totalConnections: connections.length })
})

// ─── Connect two orgs ────────────────────────
router.post('/connect', (req, res) => {
  const { fromOrgId, toOrgId, type, strength = 1 } = req.body
  if (!fromOrgId || !toOrgId) return res.status(400).json({ error: 'fromOrgId and toOrgId required' })
  const existing = connections.find(c =>
    (c.fromOrgId === fromOrgId && c.toOrgId === toOrgId) ||
    (c.fromOrgId === toOrgId   && c.toOrgId === fromOrgId)
  )
  if (existing) {
    existing.strength++
    return res.json({ connection: existing })
  }
  const connection = {
    id:        crypto.randomUUID(),
    fromOrgId,
    toOrgId,
    type,      // deal, partnership, supplier, client, competitor
    strength,
    createdAt: new Date(),
  }
  connections.push(connection)
  const fromNode = nodes.find(n => n.orgId === fromOrgId)
  const toNode   = nodes.find(n => n.orgId === toOrgId)
  if (fromNode) fromNode.degree++
  if (toNode)   toNode.degree++
  res.status(201).json({ connection })
})

// ─── Clusters ────────────────────────────────
router.get('/clusters', (req, res) => {
  const industryMap: Record<string, any[]> = {}
  nodes.forEach(n => {
    if (!industryMap[n.industry]) industryMap[n.industry] = []
    industryMap[n.industry].push(n)
  })
  const clusterList = Object.entries(industryMap).map(([industry, members]) => ({
    industry, members: members.length, nodes: members,
  }))
  res.json({ clusters: clusterList })
})

// ─── Network stats ───────────────────────────
router.get('/stats', (req, res) => {
  const avgDegree = nodes.length ? nodes.reduce((s, n) => s + n.degree, 0) / nodes.length : 0
  const topNodes  = [...nodes].sort((a, b) => b.degree - a.degree).slice(0, 10)
  res.json({
    stats: {
      totalNodes:       nodes.length,
      totalConnections: connections.length,
      avgDegree:        Math.round(avgDegree * 10) / 10,
      topConnected:     topNodes,
      density:          nodes.length > 1 ? connections.length / (nodes.length * (nodes.length - 1) / 2) : 0,
    }
  })
})

export default router
