import { chatHandler } from '../server/core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  }
  const { status, body } = await chatHandler(req.body)
  res.status(status).json(body)
}
