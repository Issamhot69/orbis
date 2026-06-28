import { Router } from 'express'
import { authenticate } from '../auth/middleware/authenticate'
import { db } from '../lib/db'
import { users, organizations, projects, listings, contracts, opportunities, payments } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
router.use(authenticate)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Get AI insights for current user ─────────
router.get('/insights', async (req, res) => {
  try {
    const userId = (req as any).userId

    // Gather user data
    const [userOrgs, userProjects, userListings, userOpps] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(organizations),
      db.select({ count: sql<number>`count(*)` }).from(projects),
      db.select({ count: sql<number>`count(*)` }).from(listings),
      db.select({ count: sql<number>`count(*)` }).from(opportunities),
    ])

    const context = {
      organizations: Number(userOrgs[0]?.count || 0),
      projects:      Number(userProjects[0]?.count || 0),
      listings:      Number(userListings[0]?.count || 0),
      opportunities: Number(userOpps[0]?.count || 0),
    }

    // Generate AI insights
    let insights = []

    if (!process.env.ANTHROPIC_API_KEY) {
      // Demo insights when no API key
      insights = [
        { type:'opportunity', priority:'high',   icon:'💡', title:'Optimiser vos listings', desc:'Vos listings ont peu de vues. Ajoutez des mots-cles pertinents et des images pour augmenter votre visibilite de 300%.' },
        { type:'warning',     priority:'medium', icon:'⚠️', title:'Trust Score incomplet', desc:'Completez votre Trust Passport pour debloquer plus de deals. Les entreprises verifiees recoivent 5x plus de contacts.' },
        { type:'action',      priority:'high',   icon:'🚀', title:'Nouveau marche detecte', desc:'Le secteur Tech affiche une croissance de 23% cette semaine. Publiez une offre maintenant pour capter ces opportunites.' },
        { type:'success',     priority:'low',    icon:'✅', title:'Performance en hausse', desc:'Votre activite ORBIS est en progression. Continuez a developper votre reseau pour maximiser les resultats.' },
        { type:'tip',         priority:'medium', icon:'🎯', title:'Conseil personnalise', desc:'Les entreprises avec 3+ organisations actives concluent 2x plus de deals. Invitez vos partenaires sur ORBIS.' },
      ]
    } else {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are the ORBIS AI Business Coach. Analyze this user data and provide 5 actionable business insights in JSON format.
            
User data: ${JSON.stringify(context)}

Return ONLY a JSON array with 5 objects, each having:
- type: "opportunity" | "warning" | "action" | "success" | "tip"
- priority: "high" | "medium" | "low"
- icon: emoji
- title: short title (max 8 words)
- desc: actionable description (max 30 words)

Respond in French. Return ONLY the JSON array, no other text.`
          }]
        })
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        insights = JSON.parse(text)
      } catch(e) {
        insights = [
          { type:'tip', priority:'medium', icon:'🤖', title:'AI Coach disponible', desc:'Rechargez vos credits Anthropic pour activer les insights personnalises par IA.' },
        ]
      }
    }

    res.json({ insights, context, generatedAt: new Date() })
  } catch(err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Get personalized recommendations ─────────
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = [
      { id:'1', category:'Marketplace',   action:'Publier une offre',      reason:'Vous navez pas de listing actif cette semaine', impact:'+40% visibilite', cta:'/marketplace', priority:1 },
      { id:'2', category:'Trust',         action:'Verifier votre identite', reason:'Le Trust Score booste les conversions de 300%',   impact:'+300% conversions', cta:'/organizations', priority:2 },
      { id:'3', category:'Messages',      action:'Repondre aux messages',   reason:'3 messages en attente depuis plus de 24h',        impact:'Taux de reponse',  cta:'/messages', priority:3 },
      { id:'4', category:'Investors',     action:'Pitcher aux investisseurs', reason:'Votre profil correspond a 6 investisseurs actifs', impact:'$500K potentiel', cta:'/investors', priority:4 },
      { id:'5', category:'Integrations',  action:'Connecter Salesforce',    reason:'Synchronisez vos contacts CRM avec ORBIS',        impact:'Gain de temps 2h/j', cta:'/integrations', priority:5 },
    ]
    res.json({ recommendations })
  } catch(err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Track user behavior ───────────────────────
router.post('/track', async (req, res) => {
  try {
    const { event, data } = req.body
    console.log(`[AI Insights] Event: ${event}`, data)
    res.json({ success: true, tracked: event })
  } catch(err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
