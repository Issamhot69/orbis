import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { initSocket } from './lib/socket'
import { rateLimiter, fraudDetection } from './lib/security'
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
import adminRoutes         from './admin/admin.routes'

const app        = express()
const httpServer = createServer(app)
const io         = initSocket(httpServer)
const PORT       = process.env.PORT || 4080

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(rateLimiter(200, 60000))
app.use(fraudDetection)

app.set('io', io)

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
app.use('/api/admin',         adminRoutes)

httpServer.listen(PORT, () => {
  console.log(``)
  console.log(`🌍 ORBIS v2.0.0 — http://localhost:${PORT}`)
  console.log(`⚡ WebSocket actif — Socket.io`)
  console.log(``)
})

export { io }
export default app
