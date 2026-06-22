import { reportHandler, scheduledEmailsHandler, previewEmailsHandler, unsubscribeHandler } from '../server/notify.js'

// This function serves several related "notification" jobs so we stay under
// Vercel's 12-function Hobby limit:
//   • POST /api/report                            — "report a problem" form
//   • GET  /api/report (Bearer CRON_SECRET)       — daily welcome + trial-reminder run
//   • GET/POST /api/report?unsubscribe=<id>&t=…   — one-click marketing unsubscribe
export default async function handler(req, res) {
  // Public unsubscribe link from marketing emails (GET click / POST one-click).
  // No auth — the HMAC token in `t` is the credential.
  if (req.query?.unsubscribe) {
    const { status, html, json } = await unsubscribeHandler(String(req.query.unsubscribe), String(req.query.t || ''))
    if (req.method === 'POST') return res.status(status).json(json || { ok: true })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(status).send(html)
  }
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
