import { checkoutHandler } from '../server/stripe.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  const { status, body } = await checkoutHandler(token)
  res.status(status).json(body)
}
