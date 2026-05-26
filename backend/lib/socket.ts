import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'orbis_dev_secret'

export const connectedUsers = new Map<string, string>()

export function initSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET','POST'] }
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('No token'))
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
      ;(socket as any).userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', socket => {
    const userId = (socket as any).userId
    connectedUsers.set(userId, socket.id)
    console.log(`[Socket] User connected: ${userId}`)

    socket.on('join-org', (orgId: string) => {
      socket.join('org:' + orgId)
      console.log(`[Socket] User ${userId} joined org: ${orgId}`)
    })

    socket.on('new-message', (data: any) => {
      io.to('org:' + data.orgId).emit('message-received', data)
    })

    socket.on('typing', (data: any) => {
      socket.to('org:' + data.orgId).emit('user-typing', { userId, channelId: data.channelId })
    })

    socket.on('disconnect', () => {
      connectedUsers.delete(userId)
      console.log(`[Socket] User disconnected: ${userId}`)
    })
  })

  return io
}

export function sendNotification(io: any, userId: string, notification: any) {
  const socketId = connectedUsers.get(userId)
  if (socketId) {
    io.to(socketId).emit('notification', notification)
  }
}
