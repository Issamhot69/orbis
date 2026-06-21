import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from '../../lib/db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate'

const router     = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'orbis_dev_secret'

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' } as any)
}

function sanitize(user: any) {
  const { passwordHash, ...safe } = user
  return safe
}

// ─── Register ────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body
    if (!email || !password || !firstName || !lastName)
      return res.status(400).json({ error: 'All fields required' })

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(), passwordHash, firstName, lastName,
    }).returning()

    const token = generateToken(user.id)
    res.status(201).json({ token, user: sanitize(user) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Login ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
    const token = generateToken(user.id)
    res.json({ token, user: sanitize(user) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Me ──────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, (req as any).userId)).limit(1)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user: sanitize(user) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── OAuth Google (simulation) ───────────────
router.get('/google', (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID || 'demo'}&` +
    `redirect_uri=${process.env.FRONTEND_URL || 'http://localhost:3090'}/auth/google/callback&` +
    `response_type=code&scope=email profile`
  res.json({ url: googleAuthUrl, message: 'Configure GOOGLE_CLIENT_ID in .env to enable Google OAuth' })
})

router.post('/google/callback', async (req, res) => {
  try {
    const { email, firstName, lastName, googleId } = req.body
    if (!email) return res.status(400).json({ error: 'email required' })

    let [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)

    if (!user) {
      const [newUser] = await db.insert(users).values({
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
        firstName: firstName || email.split('@')[0],
        lastName:  lastName  || 'User',
        isVerified: true,
      }).returning()
      user = newUser
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
    const token = generateToken(user.id)
    res.json({ token, user: sanitize(user) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── 2FA — Send code ─────────────────────────
const otpStore = new Map<string, { code: string, expires: number }>()

router.post('/2fa/send', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId
    const [user]  = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const code    = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = Date.now() + 10 * 60 * 1000

    otpStore.set(userId, { code, expires })

    console.log(`[2FA] Code pour ${user.email}: ${code}`)

    res.json({
      message: '2FA code sent',
      email:   user.email,
      code:    process.env.NODE_ENV === 'development' ? code : undefined,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── 2FA — Verify code ───────────────────────
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId
    const { code } = req.body

    const stored = otpStore.get(userId)
    if (!stored) return res.status(400).json({ error: 'No 2FA code found — request a new one' })
    if (Date.now() > stored.expires) {
      otpStore.delete(userId)
      return res.status(400).json({ error: '2FA code expired' })
    }
    if (stored.code !== code) return res.status(400).json({ error: 'Invalid 2FA code' })

    otpStore.delete(userId)
    await db.update(users).set({ isVerified: true }).where(eq(users.id, userId))

    res.json({ success: true, message: '2FA verified successfully' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Change password ─────────────────────────
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'currentPassword and newPassword required' })

    const [user] = await db.select().from(users).where(eq(users.id, (req as any).userId)).limit(1)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid current password' })

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id))

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Logout ──────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' })
})


// ─── Get current user profile ─────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, (req as any).userId)).limit(1)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user: sanitize(user) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Update current user profile ──────────────
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, avatarUrl } = req.body
    const updates: any = { updatedAt: new Date() }
    if (firstName !== undefined) updates.firstName = firstName
    if (lastName  !== undefined) updates.lastName  = lastName
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl

    const [user] = await db.update(users).set(updates).where(eq(users.id, (req as any).userId)).returning()
    res.json({ user: sanitize(user) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Forgot password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'email required' })

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    // Always respond success even if user not found, to avoid leaking which emails exist
    if (!user) return res.json({ success: true, message: 'If this email exists, a reset link was sent' })

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1h

    await db.update(users).set({ resetToken, resetTokenExpiry }).where(eq(users.id, user.id))

    const resetLink = (process.env.FRONTEND_URL || 'http://localhost:3090') + '/reset-password?token=' + resetToken
    console.log(`[Auth] Password reset link for ${user.email}: ${resetLink}`)

    res.json({ success: true, message: 'If this email exists, a reset link was sent', demoLink: resetLink })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Reset password ─────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' })

    const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1)
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' })
    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date())
      return res.status(400).json({ error: 'Reset token has expired' })

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.update(users).set({ passwordHash, resetToken: null, resetTokenExpiry: null, updatedAt: new Date() }).where(eq(users.id, user.id))

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
