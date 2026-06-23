// Local development server. In production these same handlers run as Vercel
// serverless functions (see api/*.js) — this Express wrapper just exists so
// `npm run dev` works without the Vercel CLI.
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { healthHandler, meHandler, visionHandler, chatHandler, mealsHandler, dishHandler, methodHandler } from './core.js'
import { reportHandler } from './notify.js'
import { deleteAccountHandler } from './auth.js'
import { checkoutHandler, confirmCheckoutHandler, billingPortalHandler, webhookHandler } from './stripe.js'

const PORT = process.env.API_PORT || 8787

const app = express()
// This Express wrapper is for local dev (Vercel functions are same-origin in
// prod), but if it's ever deployed, lock CORS to APP_URL rather than allowing
// every origin to call the authenticated endpoints.
app.use(cors(
  process.env.NODE_ENV === 'production' && process.env.APP_URL
    ? { origin: process.env.APP_URL }
    : {}
))

const send = (res, { status, body }) => res.status(status).json(body)
// Pull the user's access token out of the Authorization header (if signed in).
const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null

// The Stripe webhook needs the RAW body for signature verification, so it must
// be registered with the raw parser BEFORE the global JSON middleware.
app.post('/api/stripe-webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const { status, body } = await webhookHandler(req.body, req.headers['stripe-signature'])
  res.status(status).json(body)
})

app.use(express.json({ limit: '12mb' })) // base64 photos can be a couple of MB

app.get('/api/health', (_req, res) => send(res, healthHandler()))
app.get('/api/me', async (req, res) => send(res, await meHandler(bearer(req))))
app.post('/api/vision', async (req, res) => send(res, await visionHandler(req.body, bearer(req))))
app.post('/api/chat', async (req, res) => send(res, await chatHandler(req.body, bearer(req))))
// /api/meals doubles as the walkthrough endpoint (kind:'method') so production
// stays under the Hobby plan's 12-function limit — mirror that here.
app.post('/api/meals', async (req, res) =>
  send(res, await (req.body?.kind === 'method' ? methodHandler(req.body, bearer(req)) : mealsHandler(req.body, bearer(req))))
)
app.post('/api/dish', async (req, res) => send(res, await dishHandler(req.body, bearer(req))))
app.post('/api/report', async (req, res) => send(res, await reportHandler(req.body, bearer(req), req.ip)))
app.post('/api/delete-account', async (req, res) => send(res, await deleteAccountHandler(bearer(req))))
app.post('/api/checkout', async (req, res) => send(res, await checkoutHandler(bearer(req))))
app.post('/api/checkout-confirm', async (req, res) => send(res, await confirmCheckoutHandler(req.body, bearer(req))))
app.post('/api/billing-portal', async (req, res) => send(res, await billingPortalHandler(bearer(req))))

app.listen(PORT, () => {
  console.log(`Fridge API listening on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  No ANTHROPIC_API_KEY set — chat and photo recognition will return a setup message until you add one.')
  }
})
