import { webhookHandler } from '../server/stripe.js'

// Stripe needs the exact raw request bytes to verify the signature, so opt out
// of Vercel's body parsing for this route.
export const config = { api: { bodyParser: false } }

async function readRaw(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  }
  const signature = req.headers['stripe-signature']
  const raw = await readRaw(req)
  const { status, body } = await webhookHandler(raw, signature)
  res.status(status).json(body)
}
