// Outbound email via Resend's REST API. Deliberately has NO SDK dependency (just
// fetch) and is INERT until RESEND_API_KEY is set — so nothing breaks or sends
// before email is configured. Once the key + a verified domain are in place,
// these go out from EMAIL_FROM.

import { createHmac } from 'node:crypto'

// One-click unsubscribe for marketing emails (GDPR/PECR). The token is an HMAC
// of the user id so the link can't be forged to unsubscribe someone else, and
// needs no stored state. Secret is server-only.
const UNSUB_SECRET =
  process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'dev-unsub'
const APP_BASE = (process.env.APP_URL || 'https://app.whatsinmyfridge.co.uk').replace(/\/$/, '')

export function unsubscribeToken(userId) {
  return createHmac('sha256', UNSUB_SECRET).update(String(userId)).digest('hex').slice(0, 32)
}
export function unsubscribeUrl(userId) {
  return `${APP_BASE}/api/report?unsubscribe=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`
}

// FROM must stay on the Resend-verified domain; support@ has no mailbox behind
// it, so every outgoing email carries SUPPORT_EMAIL as reply-to — customer
// replies land in the monitored gmail instead of bouncing into the void.
const FROM = process.env.EMAIL_FROM || "What's in my Fridge <support@whatsinmyfridge.co.uk>"
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'hello.whatsinmyfridge@gmail.com'
// Where owner notifications (new subscriber, problem reports) are delivered.
export const OWNER_EMAIL = process.env.OWNER_EMAIL || SUPPORT_EMAIL

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY)
}

// Returns { ok } on success, { skipped:true } when email isn't configured (so
// callers can treat "not set up yet" as a soft success), { ok:false } on error.
export async function sendEmail({ to, subject, html, replyTo, unsubscribeUrl }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { skipped: true }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || SUPPORT_EMAIL,
        // One-click unsubscribe for marketing mail — surfaces the native
        // "unsubscribe" button in Gmail/Apple Mail and lets them POST to opt out.
        ...(unsubscribeUrl
          ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
          : {})
      })
    })
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text().catch(() => ''))
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('Email send failed:', err?.message || err)
    return { ok: false }
  }
}

const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// Shared branded shell for outgoing emails. `footerExtra` appends to the footer
// line (used for the marketing-email unsubscribe link).
const shell = (title, inner, footerExtra = '') => `<!doctype html><html><body style="margin:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1b16">
  <div style="max-width:520px;margin:0 auto;padding:28px 22px">
    <img src="${APP_BASE}/email-logo.png" alt="What's in my Fridge" width="188" style="display:block;width:188px;max-width:62%;height:auto;border:0;margin-bottom:16px" />
    <div style="background:#fffdf9;border:1px solid #ebe5d8;border-radius:16px;padding:24px">
      <h1 style="margin:0 0 12px;font-size:19px;font-family:Georgia,serif;font-weight:600">${title}</h1>
      ${inner}
    </div>
    <p style="color:#8a8170;font-size:12px;margin:16px 6px">What's in my Fridge · <a href="https://whatsinmyfridge.co.uk" style="color:#5d5648">whatsinmyfridge.co.uk</a>${footerExtra}</p>
  </div>
</body></html>`

const button = (href, label) =>
  `<p style="margin:18px 0 4px"><a href="${href}" style="background:#2f7d5a;color:#fdfdfb;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:999px;font-size:14px;display:inline-block">${label}</a></p>`

export function welcomeEmail() {
  return {
    subject: "Welcome to What's in my Fridge 🥦",
    html: shell("You're in — welcome!", `
      <p style="font-size:15px;line-height:1.55;color:#5d5648;margin:0 0 10px">Thanks for joining! You've got <strong>the full app free for 14 days</strong>. Quickest way to start:</p>
      <ul style="font-size:15px;line-height:1.6;color:#5d5648;padding-left:18px;margin:0">
        <li><strong>Snap what's in your fridge</strong> — the AI turns it into tonight's dinner.</li>
        <li><strong>Track your fridge &amp; build a shopping list</strong> — try them free during your trial.</li>
        <li><strong>Add it to your home screen</strong> so it's one tap away.</li>
      </ul>
      ${button('https://app.whatsinmyfridge.co.uk', 'Open the app')}
      <p style="font-size:13px;color:#8a8170;margin:14px 0 0">After 14 days, dinner-from-a-photo stays free — keep the rest with Plus for £3.99/month.</p>
    `)
  }
}

export function trialReminderEmail(daysLeft) {
  const when = daysLeft <= 1 ? 'tomorrow' : `in ${daysLeft} days`
  return {
    subject: `Your trial ends ${when} — keep your fridge & list`,
    html: shell(`Your trial ends ${when}`, `
      <p style="font-size:15px;line-height:1.55;color:#5d5648;margin:0">When your trial ends, dinner-from-a-photo stays free — but your <strong>fridge, shopping list and saved meals will lock</strong>. Keep them all with Plus.</p>
      ${button('https://app.whatsinmyfridge.co.uk', 'Keep everything — £3.99/month')}
      <p style="font-size:13px;color:#8a8170;margin:14px 0 0">No card? No worries — you'll just move to the free plan with the dinner feature.</p>
    `)
  }
}

// Re-engage a lapsed free user (~a week after their trial ended) — lead with the
// free dinner hook, then the loss-framed nudge that their saved stuff is waiting.
export function reengagementEmail(unsubUrl) {
  return {
    subject: 'Stuck for dinner tonight? 🍳',
    html: shell(
      'Your fridge is waiting',
      `
      <p style="font-size:15px;line-height:1.55;color:#5d5648;margin:0 0 10px">Not sure what to cook? Snap whatever's in your fridge and we'll turn it into a few real dinner ideas, plus what to buy — that bit's <strong>always free</strong>.</p>
      ${button('https://app.whatsinmyfridge.co.uk', "See tonight's dinner")}
      <p style="font-size:13px;color:#8a8170;margin:16px 0 0">Your saved fridge, shopping list and meals are still here too — pick them back up any time with Plus for £3.99/month.</p>
    `,
      unsubUrl ? ` · <a href="${unsubUrl}" style="color:#8a8170">Unsubscribe</a>` : ''
    )
  }
}

export function newSubscriberEmail({ email, amount }) {
  return {
    subject: '🎉 New Plus subscriber!',
    html: shell("You've got a new subscriber 🎉", `
      <p style="font-size:15px;line-height:1.5;color:#5d5648;margin:0 0 6px"><strong>${esc(email || 'A customer')}</strong> just subscribed to Plus${amount ? ` (${esc(amount)})` : ''}.</p>
      <p style="font-size:13px;color:#8a8170;margin:12px 0 0">Nice one — that's recurring revenue. 🥦</p>
    `)
  }
}

// Daily founder snapshot — owner-only. A single glance at the numbers that
// matter (users, trials, paying, conversion) plus a revenue/take-home estimate
// from the FINANCES model, so you never have to log into two dashboards and do
// the maths by hand. All figures are estimates; Stripe is the source of truth
// for exact revenue.
export function founderSnapshotEmail(s) {
  const row = (emoji, label, value, sub = '') =>
    `<tr>
      <td style="padding:9px 0;border-bottom:1px solid #f0ebde;font-size:14px;color:#5d5648">${emoji}&nbsp; ${label}</td>
      <td style="padding:9px 0;border-bottom:1px solid #f0ebde;font-size:15px;color:#1f1b16;font-weight:600;text-align:right">${value}${sub ? `<span style="font-weight:400;color:#8a8170;font-size:12px"> ${sub}</span>` : ''}</td>
    </tr>`
  return {
    subject: `📊 Fridge daily — ${s.total} users · ${s.paying} paying · ~£${s.mrr}/mo`,
    html: shell(
      "Today's numbers",
      `
      <table style="width:100%;border-collapse:collapse;margin:4px 0 6px">
        ${row('👥', 'Total users', s.total.toLocaleString('en-GB'), s.newToday ? `(+${s.newToday} today)` : '')}
        ${row('🧪', 'On trial', s.trials.toLocaleString('en-GB'))}
        ${row('💳', 'Paying (Plus)', s.paying.toLocaleString('en-GB'), `· ${s.convPct}% of users`)}
        ${row('💷', 'Est. revenue', `£${s.mrr}/mo`, `· ~£${s.arr}/yr`)}
        ${row('📈', 'Est. take-home', `~£${s.takeHomeMo}/mo`, '· after costs & tax')}
      </table>
      <p style="font-size:12px;color:#8a8170;line-height:1.5;margin:14px 0 0">Estimates from your finance model (paying × £3.99, minus AI/infra/Stripe/~tax). Stripe is the source of truth for exact revenue. Sweet spot: ~10,000 users.</p>
    `
    )
  }
}

export function reportEmail({ type, message, userEmail, meta }) {
  return {
    subject: `🐞 Issue report: ${esc(type)}`,
    html: shell('New issue report', `
      <p style="margin:0 0 6px;font-size:14px"><strong>Type:</strong> ${esc(type)}</p>
      <p style="margin:0 0 6px;font-size:14px"><strong>From:</strong> ${esc(userEmail || 'anonymous')}</p>
      <p style="margin:14px 0 4px;font-size:14px"><strong>Details:</strong></p>
      <p style="white-space:pre-wrap;font-size:14px;line-height:1.5;color:#1f1b16;background:#faf7f2;border:1px solid #ece6d9;border-radius:10px;padding:12px;margin:0">${esc(message)}</p>
      ${meta ? `<p style="font-size:11px;color:#8a8170;margin:12px 0 0">${esc(meta)}</p>` : ''}
    `)
  }
}
