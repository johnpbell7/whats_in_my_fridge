import { meHandler } from '../server/core.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use GET.' })
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  // Device fingerprint + IP let the server record where an account was made and
  // gate the trial per device (light anti-abuse). /api/me fires on every app
  // load, so it's the natural place to stamp them onto the profile.
  const deviceId = req.headers['x-device-id'] || null
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null
  const { status, body } = await meHandler(token, { deviceId, ip })
  res.setHeader('Cache-Control', 'no-store') // usage count must always be live
  res.status(status).json(body)
}
