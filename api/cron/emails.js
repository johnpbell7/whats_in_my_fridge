import { scheduledEmailsHandler } from '../../server/notify.js'

// Triggered by Vercel Cron (see vercel.json). Vercel includes
// `Authorization: Bearer $CRON_SECRET` on scheduled requests.
export default async function handler(req, res) {
  const { status, body } = await scheduledEmailsHandler(req.headers.authorization || '')
  res.status(status).json(body)
}
