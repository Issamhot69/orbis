import { Router } from 'express'
import Stripe from 'stripe'
import { authenticate } from '../auth/middleware/authenticate'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo', {
  apiVersion: '2024-12-18.acacia',
})

const PLANS = [
  { id:'free',       name:'Free',       price:0,    priceId:'',                          features:['5 users','1 org','Basic marketplace','Community support'] },
  { id:'pro',        name:'Pro',        price:49,   priceId:'price_pro_monthly',          features:['Unlimited users','5 orgs','Full marketplace','Priority support','AI Assistant','Voice Clone','Document Scanner'] },
  { id:'enterprise', name:'Enterprise', price:199,  priceId:'price_enterprise_monthly',   features:['Unlimited everything','Custom domain','Dedicated support','White label','API access','Custom AI training','SLA 99.9%'] },
]

// ─── Get plans ───────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS })
})

// ─── Create checkout session ──────────────────
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { planId } = req.body
    const plan = PLANS.find(p => p.id === planId)

    if (!plan || plan.price === 0) {
      return res.status(400).json({ error: 'Invalid plan' })
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_demo') {
      return res.json({
        message: 'Stripe demo mode — configure STRIPE_SECRET_KEY in .env',
        plan: plan.name,
        price: plan.price,
        demo: true,
        checkoutUrl: null,
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: plan.priceId,
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&plan=${planId}`,
      cancel_url:  `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
      metadata: {
        userId: (req as any).userId,
        planId,
      },
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Webhook ──────────────────────────────────
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.json({ received: true, demo: true })
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`[Stripe] Payment success — user: ${session.metadata?.userId}, plan: ${session.metadata?.planId}`)
        break
      case 'customer.subscription.deleted':
        console.log('[Stripe] Subscription cancelled')
        break
    }

    res.json({ received: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── Create payment intent ────────────────────
router.post('/payment-intent', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'usd', description } = req.body

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_demo') {
      return res.json({
        demo: true,
        message: 'Stripe demo mode',
        clientSecret: 'demo_secret_'+Date.now(),
        amount, currency,
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      description,
      metadata: { userId: (req as any).userId },
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Get subscription status ──────────────────
router.get('/subscription', authenticate, (req, res) => {
  res.json({
    plan: 'free',
    status: 'active',
    message: 'Configure STRIPE_SECRET_KEY to enable real subscriptions',
  })
})

export default router
