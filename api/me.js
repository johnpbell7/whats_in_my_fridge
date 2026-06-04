import { meHandler } from '../server/core.js'

export default async function handler(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  const { status, body } = await meHandler(token)
  res.status(status).json(body)
}
