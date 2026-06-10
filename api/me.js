import { meHandler } from '../server/core.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use GET.' })
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  const { status, body } = await meHandler(token)
  res.setHeader('Cache-Control', 'no-store') // usage count must always be live
  res.status(status).json(body)
}
