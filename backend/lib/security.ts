import { Request, Response, NextFunction } from 'express'

// ─── Rate Limiting Store ──────────────────────
const requestCounts = new Map<string, { count: number, resetAt: number }>()
const blacklist     = new Set<string>()
const suspiciousIPs = new Map<string, number>()

// ─── Rate Limiter ─────────────────────────────
export function rateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip  = req.ip || req.socket.remoteAddress || 'unknown'
    const key = ip
    const now = Date.now()

    if (blacklist.has(ip)) {
      return res.status(403).json({
        error: 'Access denied',
        code:  'BLACKLISTED',
        message: 'Your IP has been blocked by ORBIS Security AI'
      })
    }

    const record = requestCounts.get(key)
    if (!record || now > record.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    record.count++
    if (record.count > maxRequests) {
      suspiciousIPs.set(ip, (suspiciousIPs.get(ip) || 0) + 1)
      if ((suspiciousIPs.get(ip) || 0) > 5) {
        blacklist.add(ip)
        console.log(`[Security] IP blacklisted: ${ip}`)
      }
      return res.status(429).json({
        error: 'Too many requests',
        code:  'RATE_LIMITED',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      })
    }

    next()
  }
}

// ─── Trust Score Guard ────────────────────────
export function requireTrust(minScore = 50) {
  return (req: Request, res: Response, next: NextFunction) => {
    const trustScore = Number((req as any).user?.trustScore || 100)
    if (trustScore < minScore) {
      return res.status(403).json({
        error: 'Trust score too low',
        code:  'LOW_TRUST',
        required: minScore,
        current:  trustScore,
        message:  'Complete your Trust Passport to access this feature'
      })
    }
    next()
  }
}

// ─── Fraud Detection ──────────────────────────
export function fraudDetection(req: Request, res: Response, next: NextFunction) {
  const body       = req.body || {}
  const suspicious = []

  // Check for SQL injection
  const sqlPatterns = /(\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUNION\b|--|;--)/i
  const bodyStr = JSON.stringify(body)
  if (sqlPatterns.test(bodyStr)) {
    suspicious.push('SQL_INJECTION')
  }

  // Check for XSS
  const xssPatterns = /<script|javascript:|onerror=|onload=/i
  if (xssPatterns.test(bodyStr)) {
    suspicious.push('XSS_ATTEMPT')
  }

  // Check for suspicious amounts
  if (body.amount && (body.amount < 0 || body.amount > 10000000)) {
    suspicious.push('SUSPICIOUS_AMOUNT')
  }

  // Check for bot patterns
  const ua = req.headers['user-agent'] || ''
  if (!ua || ua.length < 10) {
    suspicious.push('BOT_DETECTED')
  }

  if (suspicious.length > 0) {
    const ip = req.ip || 'unknown'
    console.log(`[Security] Suspicious activity from ${ip}: ${suspicious.join(', ')}`)
    suspiciousIPs.set(ip, (suspiciousIPs.get(ip) || 0) + 2)

    if (suspicious.includes('SQL_INJECTION') || suspicious.includes('XSS_ATTEMPT')) {
      return res.status(400).json({
        error: 'Request blocked by ORBIS Security AI',
        code:  'SECURITY_VIOLATION',
        reason: suspicious
      })
    }
  }

  next()
}

// ─── Admin: Get Security Stats ────────────────
export function getSecurityStats() {
  return {
    blacklistedIPs:  blacklist.size,
    suspiciousIPs:   suspiciousIPs.size,
    activeRequests:  requestCounts.size,
    blacklist:       Array.from(blacklist),
  }
}

// ─── Admin: Unban IP ──────────────────────────
export function unbanIP(ip: string) {
  blacklist.delete(ip)
  suspiciousIPs.delete(ip)
  return { success: true, ip }
}

// ─── Admin: Ban IP ────────────────────────────
export function banIP(ip: string) {
  blacklist.add(ip)
  return { success: true, ip }
}
