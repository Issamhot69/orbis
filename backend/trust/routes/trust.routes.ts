import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const passports: any[]     = []
const verifications: any[] = []
const endorsements: any[]  = []
const reviews: any[]       = []

// ─── Create Trust Passport ───────────────────
router.post('/passport', (req, res) => {
  const { orgId, type, bio, skills = [], languages = [], certifications = [] } = req.body
  if (!orgId) return res.status(400).json({ error: 'orgId required' })
  const existing = passports.find(p => p.orgId === orgId)
  if (existing) return res.status(409).json({ error: 'Passport already exists for this org' })
  const passport = {
    id:             crypto.randomUUID(),
    orgId,
    type,           // company, freelancer, agency, expert
    bio,
    skills,
    languages,
    certifications,
    trustScore:     0,
    verified:       false,
    badges:         [],
    createdBy:      (req as any).userId,
    createdAt:      new Date(),
    updatedAt:      new Date(),
  }
  passports.push(passport)
  res.status(201).json({ passport })
})

// ─── Get passport ────────────────────────────
router.get('/passport/:orgId', (req, res) => {
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const passportVerifications = verifications.filter(v => v.passportId === passport.id)
  const passportEndorsements  = endorsements.filter(e => e.passportId === passport.id)
  const passportReviews       = reviews.filter(r => r.passportId === passport.id)
  const trustScore = calculateTrustScore(passportVerifications, passportEndorsements, passportReviews)
  passport.trustScore = trustScore
  res.json({ passport, verifications: passportVerifications, endorsements: passportEndorsements, reviews: passportReviews })
})

// ─── Update passport ─────────────────────────
router.patch('/passport/:orgId', (req, res) => {
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const { bio, skills, languages, certifications, type } = req.body
  if (bio)            passport.bio            = bio
  if (skills)         passport.skills         = skills
  if (languages)      passport.languages      = languages
  if (certifications) passport.certifications = certifications
  if (type)           passport.type           = type
  passport.updatedAt = new Date()
  res.json({ passport })
})

// ─── Verifications ───────────────────────────
router.post('/passport/:orgId/verify', (req, res) => {
  const { type, data, status = 'pending' } = req.body
  if (!type) return res.status(400).json({ error: 'type required' })
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const verification = {
    id:          crypto.randomUUID(),
    passportId:  passport.id,
    type,        // identity, business, address, phone, email, linkedin, tax
    data,
    status,      // pending, verified, rejected
    verifiedAt:  status === 'verified' ? new Date() : null,
    createdAt:   new Date(),
  }
  verifications.push(verification)
  if (status === 'verified') {
    passport.verified = verifications.filter(v => v.passportId === passport.id && v.status === 'verified').length >= 2
    addBadge(passport, type)
  }
  res.status(201).json({ verification })
})

router.get('/passport/:orgId/verifications', (req, res) => {
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const list = verifications.filter(v => v.passportId === passport.id)
  res.json({ verifications: list })
})

// ─── Endorsements ────────────────────────────
router.post('/passport/:orgId/endorse', (req, res) => {
  const { skill, comment } = req.body
  if (!skill) return res.status(400).json({ error: 'skill required' })
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const existing = endorsements.find(e => e.passportId === passport.id && e.fromUserId === (req as any).userId && e.skill === skill)
  if (existing) return res.status(409).json({ error: 'Already endorsed this skill' })
  const endorsement = {
    id:          crypto.randomUUID(),
    passportId:  passport.id,
    fromUserId:  (req as any).userId,
    skill,
    comment,
    createdAt:   new Date(),
  }
  endorsements.push(endorsement)
  res.status(201).json({ endorsement })
})

// ─── Reviews ─────────────────────────────────
router.post('/passport/:orgId/review', (req, res) => {
  const { rating, comment, projectId } = req.body
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' })
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const review = {
    id:         crypto.randomUUID(),
    passportId: passport.id,
    fromUserId: (req as any).userId,
    rating,
    comment,
    projectId,
    createdAt:  new Date(),
  }
  reviews.push(review)
  res.status(201).json({ review })
})

router.get('/passport/:orgId/reviews', (req, res) => {
  const passport = passports.find(p => p.orgId === req.params.orgId)
  if (!passport) return res.status(404).json({ error: 'Trust Passport not found' })
  const list = reviews.filter(r => r.passportId === passport.id)
  const avg  = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
  res.json({ reviews: list, averageRating: Math.round(avg * 10) / 10, total: list.length })
})

// ─── Search passports ────────────────────────
router.get('/search', (req, res) => {
  const { skill, type, verified, minScore } = req.query
  let list = [...passports]
  if (type)     list = list.filter(p => p.type === type)
  if (verified) list = list.filter(p => p.verified === (verified === 'true'))
  if (skill)    list = list.filter(p => p.skills.some((s: string) => s.toLowerCase().includes((skill as string).toLowerCase())))
  if (minScore) list = list.filter(p => p.trustScore >= Number(minScore))
  res.json({ passports: list, total: list.length })
})

// ─── Helpers ─────────────────────────────────
function calculateTrustScore(verifs: any[], endors: any[], revs: any[]): number {
  let score = 0
  score += verifs.filter(v => v.status === 'verified').length * 15
  score += Math.min(endors.length * 2, 20)
  if (revs.length) {
    const avg = revs.reduce((s, r) => s + r.rating, 0) / revs.length
    score += Math.round(avg * 10)
  }
  return Math.min(score, 100)
}

function addBadge(passport: any, verificationType: string) {
  const badgeMap: Record<string, string> = {
    identity: '🪪 Identity Verified',
    business: '🏢 Business Verified',
    address:  '📍 Address Verified',
    phone:    '📱 Phone Verified',
    email:    '✉️ Email Verified',
    linkedin: '💼 LinkedIn Verified',
    tax:      '🧾 Tax Verified',
  }
  const badge = badgeMap[verificationType]
  if (badge && !passport.badges.includes(badge)) {
    passport.badges.push(badge)
  }
}

export default router
