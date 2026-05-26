import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const matches: any[]   = []
const requests: any[]  = []

// ─── Find matches for a listing ──────────────
router.post('/find', async (req, res) => {
  const { listingId, orgId, needs, budget, skills = [], languages = [], type } = req.body
  if (!orgId || !needs) return res.status(400).json({ error: 'orgId and needs required' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role:    'user',
          content: `Tu es le moteur de matching B2B d'ORBIS.
Un client cherche : ${needs}
Budget : ${budget || 'non spécifié'}
Compétences requises : ${skills.join(', ') || 'non spécifiées'}
Langues : ${languages.join(', ') || 'non spécifiées'}
Type : ${type || 'service'}

Génère 3 profils fictifs de partenaires B2B idéaux pour ce besoin.
Réponds UNIQUEMENT en JSON valide avec ce format :
{
  "matches": [
    {
      "name": "Nom entreprise",
      "type": "agency|freelancer|company|expert",
      "score": 95,
      "skills": ["skill1", "skill2"],
      "description": "Pourquoi ce match est parfait",
      "estimatedPrice": 5000,
      "currency": "USD",
      "deliveryDays": 30,
      "trustScore": 87,
      "languages": ["French", "English"]
    }
  ]
}`,
        }],
      }),
    })

    const data = await response.json() as any

    if (!response.ok) throw new Error(data.error?.message || 'AI error')

    const text    = data.content[0].text
    const parsed  = JSON.parse(text)

    const matchResult = {
      id:        crypto.randomUUID(),
      orgId,
      listingId,
      needs,
      matches:   parsed.matches,
      createdAt: new Date(),
    }
    matches.push(matchResult)

    res.json({ matchResult })
  } catch (err: any) {
    console.error('[matching/find]', err)
    res.status(500).json({ error: err.message || 'Matching error' })
  }
})

// ─── Smart recommendations ───────────────────
router.post('/recommend', async (req, res) => {
  const { orgId, industry, goals, currentChallenges } = req.body
  if (!orgId || !goals) return res.status(400).json({ error: 'orgId and goals required' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role:    'user',
          content: `Tu es le conseiller IA de la marketplace ORBIS.
Industrie : ${industry || 'non spécifiée'}
Objectifs : ${goals}
Défis actuels : ${currentChallenges || 'non spécifiés'}

Recommande 3 types de partenaires B2B que cette entreprise devrait chercher sur ORBIS.
Réponds UNIQUEMENT en JSON valide :
{
  "recommendations": [
    {
      "partnerType": "type de partenaire",
      "reason": "pourquoi ce partenaire",
      "expectedValue": "valeur attendue",
      "urgency": "high|medium|low",
      "searchQuery": "requête de recherche suggérée"
    }
  ],
  "insight": "analyse globale en 2 phrases"
}`,
        }],
      }),
    })

    const data   = await response.json() as any
    if (!response.ok) throw new Error(data.error?.message || 'AI error')
    const parsed = JSON.parse(data.content[0].text)
    res.json({ recommendations: parsed.recommendations, insight: parsed.insight })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Connection request ──────────────────────
router.post('/connect', (req, res) => {
  const { toOrgId, fromOrgId, listingId, message } = req.body
  if (!toOrgId || !fromOrgId) return res.status(400).json({ error: 'toOrgId and fromOrgId required' })
  const request = {
    id:        crypto.randomUUID(),
    fromOrgId,
    toOrgId,
    listingId,
    message,
    status:    'pending',
    createdBy: (req as any).userId,
    createdAt: new Date(),
  }
  requests.push(request)
  res.status(201).json({ request })
})

router.get('/requests', (req, res) => {
  const { orgId, status } = req.query
  let list = [...requests]
  if (orgId)  list = list.filter(r => r.fromOrgId === orgId || r.toOrgId === orgId)
  if (status) list = list.filter(r => r.status === status)
  res.json({ requests: list, total: list.length })
})

router.patch('/requests/:requestId', (req, res) => {
  const request = requests.find(r => r.id === req.params.requestId)
  if (!request) return res.status(404).json({ error: 'Request not found' })
  const { status } = req.body
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'status must be accepted or declined' })
  request.status    = status
  request.updatedAt = new Date()
  res.json({ request })
})

// ─── Match history ───────────────────────────
router.get('/history', (req, res) => {
  const { orgId } = req.query
  let list = [...matches]
  if (orgId) list = list.filter(m => m.orgId === orgId)
  list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ matches: list, total: list.length })
})

export default router
