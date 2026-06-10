// Email-triggered handlers: the "report a problem" form, and a daily scheduled
// run that welcomes new users + reminds trials that are about to end. All of it
// no-ops cleanly until RESEND_API_KEY (and, for the cron, CRON_SECRET) are set.

import { timingSafeEqual } from 'node:crypto'
import { authenticate, admin, TRIAL_DAYS } from './auth.js'
import { sendEmail, welcomeEmail, trialReminderEmail, newSubscriberEmail, reportEmail, OWNER_EMAIL } from './email.js'

const MAX_MSG = 4000

// Constant-time check of the cron Bearer token, so the secret can't be guessed
// by timing the response. Returns false when CRON_SECRET isn't set.
function cronAuthorized(authHeader = '') {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(String(authHeader))
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

// Best-effort abuse guard for the open report endpoint: it sends an email on
// every call, so an unthrottled script could flood the owner inbox and burn the
// Resend quota. This is per-instance (serverless), so it won't stop a fully
// distributed flood, but it stops the common single-source case cheaply with no
// extra infra. Legit users never hit it.
const REPORT_WINDOW_MS = 10 * 60 * 1000
const REPORT_MAX = 5
// Coarse global ceiling per serverless instance: even spread across many IPs,
// one instance won't fire more than this many report emails per window. Blunts
// the IP-rotation flood that the per-IP cap alone can't (the per-IP map is also
// per-instance — a shared KV counter would be the full fix, noted for later).
const REPORT_GLOBAL_MAX = 50
const reportHits = new Map() // ip -> recent timestamps
let globalHits = [] // recent timestamps across all IPs
function reportRateLimited(ip) {
  const now = Date.now()
  globalHits = globalHits.filter((t) => now - t < REPORT_WINDOW_MS)
  if (globalHits.length >= REPORT_GLOBAL_MAX) return true
  if (ip) {
    const hits = (reportHits.get(ip) || []).filter((t) => now - t < REPORT_WINDOW_MS)
    if (hits.length >= REPORT_MAX) {
      reportHits.set(ip, hits)
      return true
    }
    hits.push(now)
    reportHits.set(ip, hits)
    if (reportHits.size > 5000) reportHits.clear() // bound memory
  }
  globalHits.push(now)
  return false
}

// POST /api/report — a signed-in (or anonymous) user reports a problem; we email
// it to support, with their address as reply-to so you can just hit reply.
export async function reportHandler(body = {}, token, ip = null) {
  if (reportRateLimited(ip)) {
    return { status: 429, body: { error: 'rate_limited', message: 'Too many reports just now — please try again shortly.' } }
  }
  const message = String(body.message || '').trim().slice(0, MAX_MSG)
  if (!message) return { status: 400, body: { error: 'bad_request', message: 'Please describe the issue.' } }
  const type = String(body.type || 'Other').slice(0, 80)
  const meta = String(body.meta || '').slice(0, 600)

  let userEmail = null
  if (token) {
    const auth = await authenticate(token)
    if (!auth.error) userEmail = auth.user.email
  }

  const { subject, html } = reportEmail({ type, message, userEmail, meta })
  const res = await sendEmail({ to: OWNER_EMAIL, subject, html, replyTo: userEmail || undefined })
  // Treat "not configured yet" as a soft success so the form works pre-launch.
  if (res.skipped) {
    console.warn('Report received but email not configured:', type)
    return { status: 200, body: { ok: true } }
  }
  if (!res.ok) return { status: 502, body: { error: 'send_failed', message: 'Could not send right now. Please try again.' } }
  return { status: 200, body: { ok: true } }
}

// Look up a user's email (service-role admin API).
async function emailFor(db, userId) {
  try {
    const { data } = await db.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch {
    return null
  }
}

// Welcome new users + remind trials ending soon. Kept here (and wired into the
// dev server) so it's ready to re-home: the Vercel function was dropped to stay
// under the Hobby plan's 12-function limit, so trigger this from an external
// scheduler (or a Vercel cron once on Pro) hitting an endpoint that calls it.
// Protected by CRON_SECRET (sent as a Bearer token on scheduled runs).
export async function scheduledEmailsHandler(authHeader = '') {
  if (!cronAuthorized(authHeader)) {
    return { status: 401, body: { error: 'unauthorized' } }
  }
  const db = admin()
  if (!db || !process.env.RESEND_API_KEY) {
    return { status: 200, body: { ok: true, skipped: 'not-configured' } }
  }

  let welcomed = 0
  let reminded = 0
  const nowISO = () => new Date().toISOString()

  // 1) Welcome anyone we haven't welcomed yet.
  const { data: newbies } = await db.from('profiles').select('id').is('welcomed_at', null).limit(100)
  for (const p of newbies || []) {
    const email = await emailFor(db, p.id)
    if (email) {
      const { subject, html } = welcomeEmail()
      const r = await sendEmail({ to: email, subject, html })
      if (r.ok || r.skipped) {
        await db.from('profiles').update({ welcomed_at: nowISO() }).eq('id', p.id)
        if (r.ok) welcomed++
      }
    } else {
      // No email found — mark so we don't keep retrying this row forever.
      await db.from('profiles').update({ welcomed_at: nowISO() }).eq('id', p.id)
    }
  }

  // 2) Remind trials ending within ~2 days (free tier, not yet reminded).
  const { data: trials } = await db
    .from('profiles')
    .select('id, created_at, tier')
    .neq('tier', 'plus')
    .is('trial_reminded_at', null)
    .limit(300)
  const now = Date.now()
  for (const p of trials || []) {
    const created = Date.parse(p.created_at)
    if (Number.isNaN(created)) continue
    const msLeft = created + TRIAL_DAYS * 86400000 - now
    const daysLeft = Math.ceil(msLeft / 86400000)
    if (msLeft > 0 && daysLeft <= 2) {
      const email = await emailFor(db, p.id)
      if (email) {
        const { subject, html } = trialReminderEmail(daysLeft)
        const r = await sendEmail({ to: email, subject, html })
        if (r.ok || r.skipped) {
          await db.from('profiles').update({ trial_reminded_at: nowISO() }).eq('id', p.id)
          if (r.ok) reminded++
        }
      }
    } else if (msLeft <= 0) {
      // Trial already over — mark so it drops out of future runs.
      await db.from('profiles').update({ trial_reminded_at: nowISO() }).eq('id', p.id)
    }
  }

  return { status: 200, body: { ok: true, welcomed, reminded } }
}

// Send one of every email to the owner so the designs can be checked in a real
// inbox. Guarded by CRON_SECRET so it can't be used to spam the owner address.
export async function previewEmailsHandler(authHeader = '') {
  if (!cronAuthorized(authHeader)) {
    return { status: 401, body: { error: 'unauthorized' } }
  }
  if (!process.env.RESEND_API_KEY) {
    return { status: 200, body: { ok: true, skipped: 'not-configured' } }
  }
  const samples = [
    welcomeEmail(),
    trialReminderEmail(2),
    newSubscriberEmail({ email: 'newcustomer@example.com', amount: '£3.99' }),
    reportEmail({ type: 'Bug', message: "Scan didn't pick up my milk.", userEmail: 'user@example.com', meta: 'iPhone · preview' })
  ]
  let sent = 0
  for (const s of samples) {
    const r = await sendEmail({ to: OWNER_EMAIL, subject: `[Preview] ${s.subject}`, html: s.html })
    if (r.ok) sent++
  }
  return { status: 200, body: { ok: true, sent } }
}
