import { mealsHandler, methodHandler } from '../server/core.js'

// One function serves two related jobs to stay under the Hobby plan's 12-function
// limit: meal suggestions (default) and the Plus step-by-step walkthrough
// (kind: 'method'). They share the same auth/metering path.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  const { status, body } =
    req.body?.kind === 'method'
      ? await methodHandler(req.body, token)
      : await mealsHandler(req.body, token)
  res.status(status).json(body)
}
