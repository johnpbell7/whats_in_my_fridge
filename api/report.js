import { reportHandler, scheduledEmailsHandler, previewEmailsHandler } from '../server/notify.js'

// This function serves two related "notification" jobs so we stay under Vercel's
// 12-function Hobby limit:
//   • POST /api/report                       — a user submits the "report a problem" form
//   • GET  /api/report (Bearer CRON_SECRET)  — the daily scheduled run that sends
//     welcome emails to new users and reminds trials that are about to end.
//     Point an external scheduler (e.g. cron-job.org) at this once a day.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = req.headers.authorization || ''
    // ?preview=1 sends one of every email to the owner (designs check); the
    // bare daily call runs the welcome + trial-reminder job.
    const { status, body } = req.query?.preview
      ? await previewEmailsHandler(auth)
      : await scheduledEmailsHandler(auth)
    return res.status(status).json(body)
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  // Prefer Vercel's trusted client IP. The leftmost x-forwarded-for entry is
  // client-controlled (spoofable to defeat per-IP limits); the rightmost is the
  // one the trusted proxy appended, so fall back to that rather than [0].
  const xff = (req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean)
  const ip = (req.headers['x-real-ip'] || xff[xff.length - 1] || '').trim() || null
  const { status, body } = await reportHandler(req.body, token, ip)
  res.status(status).json(body)
}
