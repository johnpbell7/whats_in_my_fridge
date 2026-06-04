import { meHandler } from '../server/core.js'

export default async function handler(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  const { status, body } = await meHandler(token)
  res.setHeader('Cache-Control', 'no-store') // usage count must always be live
  res.status(status).json(body)
}
