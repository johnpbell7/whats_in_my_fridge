// Email-triggered handlers: the "report a problem" form, and a daily scheduled
// run that welcomes new users + reminds trials that are about to end. All of it
// no-ops cleanly until RESEND_API_KEY (and, for the cron, CRON_SECRET) are set.

import { timingSafeEqual } from 'node:crypto'
import { authenticate, admin, TRIAL_DAYS, dayStart } from './auth.js'
import { sendEmail, welcomeEmail, trialReminderEmail, reengagementEmail, newSubscriberEmail, reportEmail, founderSnapshotEmail, OWNER_EMAIL, unsubscribeUrl, unsubscribeToken } from './email.js'

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

// Public one-click unsubscribe from marketing emails (GDPR/PECR). Verifies the
// HMAC token (so links can't be forged), records unsubscribed_at, and returns a
// small confirmation page (link click) or JSON (List-Unsubscribe one-click POST).
// Account/transactional emails are unaffected.
const unsubPage = (title, body) =>
  `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:460px;margin:64px auto;padding:0 22px;text-align:center;color:#1f1b16"><div style="font-family:Georgia,serif;font-weight:600;font-size:22px;margin-bottom:18px">What's in my Fridge<span style="color:#2f7d5a">.</span></div><h1 style="font-family:Georgia,serif;font-size:20px;font-weight:600;margin:0 0 10px">${title}</h1><p style="color:#5d5648;line-height:1.55;margin:0">${body}</p></div>`

export async function unsubscribeHandler(userId, token) {
  const bad = {
    status: 400,
    html: unsubPage('Invalid link', 'This unsubscribe link is invalid or has expired. You can manage email preferences in your account.'),
    json: { ok: false }
  }
  if (!userId || !token) return bad
  const want = Buffer.from(unsubscribeToken(userId))
  const got = Buffer.from(String(token))
  if (got.length !== want.length || !timingSafeEqual(got, want)) return bad
  const db = admin()
  if (db) {
    try {
      await db.from('profiles').update({ unsubscribed_at: new Date().toISOString() }).eq('id', userId)
    } catch (err) {
      console.warn('unsubscribe update failed (add an `unsubscribed_at` column to profiles):', err?.message || err)
    }
  }
  return {
    status: 200,
    html: unsubPage("You're unsubscribed", "You won't get any more marketing emails from What's in my Fridge. You'll still get important account emails, like billing."),
    json: { ok: true }
  }
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

// Cheap exact-count query against profiles (HEAD, no rows returned). Returns 0
// on any error so the snapshot degrades gracefully rather than throwing.
async function countProfiles(db, build) {
  try {
    const q = build(db.from('profiles').select('id', { count: 'exact', head: true }))
    const { count } = await q
    return count || 0
  } catch {
    return 0
  }
}

// Estimated UK tax on app profit for someone whose salary already used their
// personal allowance (~£6,270 headroom left in the 20% band). Mirrors FINANCES.md:
// 20% then 40%, plus Class 4 NI (6% to £50,270, 2% above) on profit over £12,570.
function estTax(profit) {
  if (profit <= 0) return 0
  const headroom = 6270
  const incomeTax = Math.min(profit, headroom) * 0.2 + Math.max(0, profit - headroom) * 0.4
  const niBand = Math.max(0, Math.min(profit, 50270) - 12570) * 0.06 + Math.max(0, profit - 50270) * 0.02
  return incomeTax + niBand
}

// Build + send the owner-only daily founder snapshot. Estimates revenue/profit
// from the FINANCES model; Stripe remains the source of truth for exact money.
// Wrapped so a failure here never breaks the welcome/reminder jobs around it.
async function sendFounderSnapshot(db) {
  try {
    const today = dayStart()
    const trialCutoff = new Date(Date.now() - TRIAL_DAYS * 86400000).toISOString()
    const [total, paying, newToday, trials] = await Promise.all([
      countProfiles(db, (q) => q),
      countProfiles(db, (q) => q.eq('tier', 'plus')),
      countProfiles(db, (q) => q.gte('created_at', today)),
      // Active trials: not paying, signed up within the trial window.
      countProfiles(db, (q) => q.neq('tier', 'plus').gte('created_at', trialCutoff))
    ])
    if (total === 0) return false // pre-launch: nothing to report, stay quiet

    const free = Math.max(0, total - paying)
    const mrrNum = paying * 3.99
    const arrNum = paying * 47.88
    // Annual cost lines from FINANCES.md.
    const stripeFees = arrNum * 0.065
    const paidAI = paying * 2.4
    const freeAI = free * 0.5
    const infra = total >= 5000 ? 636 : 444
    const netProfit = arrNum - stripeFees - paidAI - freeAI - infra
    const takeHomeYr = netProfit - estTax(netProfit)

    const stats = {
      total,
      paying,
      newToday,
      trials,
      convPct: total ? Math.round((paying / total) * 1000) / 10 : 0,
      mrr: Math.round(mrrNum),
      arr: Math.round(arrNum),
      takeHomeMo: Math.round(Math.max(0, takeHomeYr) / 12)
    }
    const { subject, html } = founderSnapshotEmail(stats)
    const r = await sendEmail({ to: OWNER_EMAIL, subject, html })
    return Boolean(r.ok)
  } catch (err) {
    console.warn('Founder snapshot skipped:', err?.message || err)
    return false
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
  let reengaged = 0
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

  // 3) Re-engage lapsed free users ~a week after their trial ended — once each.
  // Needs a nullable `reengaged_at timestamptz` column on `profiles`; until it's
  // added, the query errors and this whole block is skipped (the others still run).
  try {
    const { data: lapsed, error } = await db
      .from('profiles')
      .select('id, created_at, tier, reengaged_at, unsubscribed_at')
      .neq('tier', 'plus')
      .is('reengaged_at', null)
      .is('unsubscribed_at', null)
      .limit(200)
    if (error) throw error
    for (const p of lapsed || []) {
      const created = Date.parse(p.created_at)
      if (Number.isNaN(created)) continue
      const daysSinceLapse = (now - (created + TRIAL_DAYS * 86400000)) / 86400000
      // Only contact people whose trial ended 7–60 days ago — not the moment they
      // lapse, and not ancient dormant accounts (mark those done so they're skipped).
      if (daysSinceLapse < 7) continue
      if (daysSinceLapse > 60) {
        await db.from('profiles').update({ reengaged_at: nowISO() }).eq('id', p.id)
        continue
      }
      const email = await emailFor(db, p.id)
      if (email) {
        const unsub = unsubscribeUrl(p.id)
        const { subject, html } = reengagementEmail(unsub)
        const r = await sendEmail({ to: email, subject, html, unsubscribeUrl: unsub })
        if (r.ok || r.skipped) {
          await db.from('profiles').update({ reengaged_at: nowISO() }).eq('id', p.id)
          if (r.ok) reengaged++
        }
      } else {
        await db.from('profiles').update({ reengaged_at: nowISO() }).eq('id', p.id)
      }
    }
  } catch (err) {
    console.warn('Re-engagement skipped (add a `reengaged_at` column to profiles to enable):', err?.message || err)
  }

  // 4) Owner-only daily founder snapshot (users / paying / revenue estimate).
  const snapshot = await sendFounderSnapshot(db)

  return { status: 200, body: { ok: true, welcomed, reminded, reengaged, snapshot } }
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
    trialReminderEmail(1),
    reengagementEmail(),
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
