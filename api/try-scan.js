import { tryScanHandler } from '../server/core.js'

// "Try it first": one fridge photo before signing up (see tryScanHandler).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  }
  // Vercel's trusted client IP (the rightmost x-forwarded-for entry; the
  // leftmost is client-controlled), as in api/report.js.
  const xff = (req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean)
  const ip = (req.headers['x-real-ip'] || xff[xff.length - 1] || '').trim() || null
  const { status, body } = await tryScanHandler(req.body, ip)
  res.status(status).json(body)
}
