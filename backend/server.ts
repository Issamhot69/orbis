import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { initSocket } from './lib/socket'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './lib/swagger'
import { rateLimiter, fraudDetection } from './lib/security'
import compression from 'compression'
dotenv.config()

import authRoutes          from './auth/routes/auth.routes'
import orgRoutes           from './organizations/routes/organization.routes'
import rolesRoutes         from './roles/routes/roles.routes'
import permissionsRoutes   from './permissions/routes/permissions.routes'
import auditRoutes         from './audit/routes/audit.routes'
import notificationsRoutes from './notifications/routes/notifications.routes'
import messagingRoutes     from './messaging/routes/messaging.routes'
import meetingsRoutes      from './meetings/routes/meetings.routes'
import projectsRoutes      from './projects/routes/projects.routes'
import memoryRoutes        from './memory/routes/memory.routes'
import trustRoutes         from './trust/routes/trust.routes'
import aiRoutes            from './ai/routes/ai.routes'
import marketplaceRoutes   from './marketplace/routes/marketplace.routes'
import matchingRoutes      from './matching/routes/matching.routes'
import contractsRoutes     from './contracts/routes/contracts.routes'
import paymentsRoutes      from './payments/routes/payments.routes'
import universeGraphRoutes from './universe-graph/routes/universe-graph.routes'
import opportunityRoutes   from './opportunity/routes/opportunity.routes'
import stripeRoutes        from './stripe/stripe.routes'
import insightsRoutes      from './ai-insights/insights.routes'
import wholesaleRoutes     from './wholesale/wholesale.routes'
import devmarketRoutes     from './devmarket/devmarket.routes'
import investorsRoutes     from './investors/investors.routes'
import adminRoutes         from './admin/admin.routes'

const app        = express()
const httpServer = createServer(app)
const io         = initSocket(httpServer)
const PORT       = process.env.PORT || 4080

app.use(compression())
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(rateLimiter(200, 60000))
app.use(fraudDetection)

app.set('io', io)

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customTitle: 'ORBIS API Docs', customSiteTitle: 'ORBIS API' }))
app.get('/api/docs-json', (_, res) => res.json(swaggerSpec))
app.get('/health', (_, res) => res.json({ status:'ok', project:'ORBIS', version:'2.0.0', websocket:true }))

app.use('/api/auth',          authRoutes)
app.use('/api/organizations', orgRoutes)
app.use('/api/roles',         rolesRoutes)
app.use('/api/permissions',   permissionsRoutes)
app.use('/api/audit',         auditRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/messaging',     messagingRoutes)
app.use('/api/meetings',      meetingsRoutes)
app.use('/api/projects',      projectsRoutes)
app.use('/api/memory',        memoryRoutes)
app.use('/api/trust',         trustRoutes)
app.use('/api/ai',            aiRoutes)
app.use('/api/marketplace',   marketplaceRoutes)
app.use('/api/matching',      matchingRoutes)
app.use('/api/contracts',     contractsRoutes)
app.use('/api/payments',      paymentsRoutes)
app.use('/api/universe-graph',universeGraphRoutes)
app.use('/api/opportunity',   opportunityRoutes)
app.use('/api/stripe',        stripeRoutes)
app.use('/api/ai-insights',   insightsRoutes)
app.use('/api/wholesale',      wholesaleRoutes)
app.use('/api/devmarket',      devmarketRoutes)
app.use('/api/investors',      investorsRoutes)
app.use('/api/admin',         adminRoutes)

httpServer.listen(PORT, () => {
  console.log(``)
  console.log(`🌍 ORBIS v2.0.0 — http://localhost:${PORT}`)
  console.log(`⚡ WebSocket actif — Socket.io`)
  console.log(``)
})

export { io }
export default app

// ─── Performance monitoring ───────────────────
const requestStats = { total: 0, errors: 0, avgMs: 0, totalMs: 0 }

app.use((req: any, res: any, next: any) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    requestStats.total++
    requestStats.totalMs += ms
    requestStats.avgMs = Math.round(requestStats.totalMs / requestStats.total)
    if (res.statusCode >= 400) requestStats.errors++
  })
  next()
})

app.get('/metrics', (_, res) => {
  const mem = process.memoryUsage()
  res.json({
    uptime:    Math.round(process.uptime()) + 's',
    requests:  requestStats,
    memory: {
      heapUsed:  Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss:       Math.round(mem.rss / 1024 / 1024) + 'MB',
    },
    node:    process.version,
    env:     process.env.NODE_ENV || 'development',
  })
})
