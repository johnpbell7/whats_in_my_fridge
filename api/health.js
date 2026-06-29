import { healthHandler } from '../server/core.js'

export default async function handler(req, res) {
  // ?ping=1 (used by the daily Vercel cron) does a tiny Supabase query so the
  // free-tier project stays active and never auto-pauses.
  const ping = req?.query?.ping === '1' || req?.query?.ping === 'true'
  const { status, body } = await healthHandler({ ping })
  res.status(status).json(body)
}
