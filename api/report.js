import { reportHandler, scheduledEmailsHandler } from '../server/notify.js'

// This function serves two related "notification" jobs so we stay under Vercel's
// 12-function Hobby limit:
//   • POST /api/report                       — a user submits the "report a problem" form
//   • GET  /api/report (Bearer CRON_SECRET)  — the daily scheduled run that sends
//     welcome emails to new users and reminds trials that are about to end.
//     Point an external scheduler (e.g. cron-job.org) at this once a day.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { status, body } = await scheduledEmailsHandler(req.headers.authorization || '')
    return res.status(status).json(body)
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
  }
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null
  const { status, body } = await reportHandler(req.body, token)
  res.status(status).json(body)
}
