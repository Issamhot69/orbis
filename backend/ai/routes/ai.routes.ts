import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const conversations: any[] = []
const messages: any[]      = []

// ─── Chat with ORBIS AI ──────────────────────
router.post('/chat', async (req, res) => {
  const { message, orgId, context, conversationId } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  let conversation = conversationId
    ? conversations.find(c => c.id === conversationId)
    : null

  if (!conversation) {
    conversation = {
      id:        crypto.randomUUID(),
      orgId,
      userId:    (req as any).userId,
      title:     message.slice(0, 50),
      createdAt: new Date(),
    }
    conversations.push(conversation)
  }

  const userMessage = {
    id:             crypto.randomUUID(),
    conversationId: conversation.id,
    role:           'user',
    content:        message,
    createdAt:      new Date(),
  }
  messages.push(userMessage)

  const history = messages
    .filter(m => m.conversationId === conversation.id)
    .map(m => ({ role: m.role, content: m.content }))

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
        system: `Tu es ORBIS AI, l'assistant intelligent de la plateforme ORBIS.
ORBIS est une plateforme B2B mondiale qui combine :
- Business OS : gestion d'équipes, projets, documents, réunions
- Marketplace B2B : mise en relation d'entreprises, Trust Passport, deals
Tu aides les entreprises à prendre de meilleures décisions, analyser leurs données, et automatiser leurs workflows.
${context ? `Contexte additionnel : ${JSON.stringify(context)}` : ''}
Réponds toujours en français sauf si l'utilisateur écrit dans une autre langue.
Sois concis, précis et orienté business.`,
        messages: history,
      }),
    })

    const data = await response.json() as any

    if (!response.ok) {
      throw new Error(data.error?.message || 'Anthropic API error')
    }

    const aiContent = data.content[0].text

    const aiMessage = {
      id:             crypto.randomUUID(),
      conversationId: conversation.id,
      role:           'assistant',
      content:        aiContent,
      tokens:         data.usage,
      createdAt:      new Date(),
    }
    messages.push(aiMessage)

    res.json({ message: aiMessage, conversation, usage: data.usage })
  } catch (err: any) {
    console.error('[ai/chat]', err)
    res.status(500).json({ error: err.message || 'AI service error' })
  }
})

// ─── List conversations ──────────────────────
router.get('/conversations', (req, res) => {
  const userId = (req as any).userId
  const { orgId } = req.query
  let list = conversations.filter(c => c.userId === userId)
  if (orgId) list = list.filter(c => c.orgId === orgId)
  list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({ conversations: list })
})

// ─── Get conversation messages ───────────────
router.get('/conversations/:conversationId', (req, res) => {
  const conversation = conversations.find(c => c.id === req.params.conversationId)
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
  const convMessages = messages.filter(m => m.conversationId === req.params.conversationId)
  res.json({ conversation, messages: convMessages })
})

// ─── AI Summarize ────────────────────────────
router.post('/summarize', async (req, res) => {
  const { content, type } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

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
        max_tokens: 512,
        messages: [{
          role:    'user',
          content: `Résume ce ${type || 'contenu'} en 3-5 points clés en français :\n\n${content}`,
        }],
      }),
    })

    const data = await response.json() as any
    res.json({ summary: data.content[0].text })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── AI Analyze ──────────────────────────────
router.post('/analyze', async (req, res) => {
  const { data, question } = req.body
  if (!data || !question) return res.status(400).json({ error: 'data and question required' })

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
          content: `Analyse ces données business et réponds à cette question en français.\n\nDonnées: ${JSON.stringify(data)}\n\nQuestion: ${question}`,
        }],
      }),
    })

    const data2 = await response.json() as any
    res.json({ analysis: data2.content[0].text })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
