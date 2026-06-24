// ---------------------------------------------------------------------------
// Accounts + usage metering for the AI endpoints.
//
// When Supabase is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), every
// call to /api/vision and /api/chat must carry a logged-in user's access token.
// We verify it, look up the user's tier, enforce a monthly quota, pick the
// right model for their tier, and record the usage. When Supabase is NOT
// configured the app runs in its original single-user "open" mode, so nothing
// breaks before you set accounts up.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SONNET = process.env.VISION_MODEL || 'claude-sonnet-4-6'
const HAIKU = process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001'

// "Generous" test mode raises every AI usage cap 500× (and lifts the daily
// safety cap) so the app can be tested without burning a real month's
// allowance. It must be turned on EXPLICITLY with AI_TEST_UNLIMITED=1 — set
// that ONLY on a genuine staging/preview environment.
//
// It used to also auto-enable on any non-production Vercel deploy
// (VERCEL_ENV !== 'production'). That was a footgun: if the live domain ever
// landed on a preview deployment, every cost guardrail silently vanished
// (500× limits, daily cap to 5000, anti-abuse off, trial effectively forever).
// Now nothing turns it on by accident — production always keeps the true
// limits, and a stray preview deploy can't reopen them.
const GENEROUS = process.env.AI_TEST_UNLIMITED === '1'
const M = GENEROUS ? 500 : 1

// Per-tier monthly limits and which vision model they get. Chat always uses the
// cheap model. Tune these to your unit economics — see SETUP_ACCOUNTS.md.
export const TIERS = {
  free: { label: 'Free', visionModel: HAIKU, scansPerMonth: 10 * M, chatsPerMonth: 30 * M },
  plus: { label: 'Plus', visionModel: SONNET, scansPerMonth: 60 * M, chatsPerMonth: 200 * M }
}

// Daily rate-limit applied to every signed-in user (anti-abuse: stops a script
// burning the whole month's allowance in one burst). Normal use never hits it.
export const DAILY = GENEROUS ? { vision: 5000, chat: 5000 } : { vision: 20, chat: 40 }

export const tierConfig = (tier) => TIERS[tier] || TIERS.free

export function authEnabled() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)
}

// One admin client (service role) — bypasses row-level security for the
// server's own reads/writes. Created lazily so importing this file is cheap.
let _admin
export function admin() {
  if (_admin === undefined) {
    _admin = authEnabled()
      ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      : null
  }
  return _admin
}

const UNAUTHENTICATED = {
  status: 401,
  body: { error: 'not_signed_in', message: 'Please sign in to use photo scanning and chat.' }
}

// The monthly window the quota resets on (UTC calendar month).
export function periodStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

// Start of today (UTC) — the window the daily rate-limit resets on.
export function dayStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

// Pure quota decision, separated out so it can be unit-tested without a DB.
// kind is 'vision' | 'chat'. Returns { allowed, limit, used }.
export function quotaDecision(tier, kind, used) {
  const cfg = tierConfig(tier)
  const limit = kind === 'vision' ? cfg.scansPerMonth : cfg.chatsPerMonth
  return { allowed: used < limit, limit, used }
}

// 429 response when the per-day rate-limit is hit.
export function dailyLimitResponse(kind, limit) {
  const what = kind === 'vision' ? 'photo scans' : 'chat questions'
  return {
    status: 429,
    body: {
      error: 'rate_limited',
      message: `That's ${limit} ${what} today — give it a rest and try again tomorrow.`,
      limit
    }
  }
}

export function overQuotaResponse(kind, decision) {
  const what = kind === 'vision' ? 'photo scans' : 'chat questions'
  return {
    status: 402,
    body: {
      error: 'quota_exceeded',
      message: `You've used all ${decision.limit} of this month's ${what} on your plan. Upgrade for more, or wait until next month.`,
      limit: decision.limit,
      used: decision.used
    }
  }
}

// Every new account gets the FULL app free for this many days (treated as Plus
// — all features unlocked), then drops to Free: the photo→dinner feature stays
// free, the rest (fridge tracking, shopping list, scan) become Plus. Two weeks
// ≈ two grocery cycles, long enough for the paid features to prove themselves.
// The countdown is anchored to each account's creation date (see effectivePlan),
// so it always reflects how long ago THAT account signed up.
//
// Kept independent of GENEROUS on purpose: real users must get a true 14-day
// trial that actually expires, even on a non-production (preview) deployment —
// otherwise the trial silently never ends. Override only when you explicitly
// want a long test window: set TRIAL_DAYS (e.g. 3650), or AI_TEST_UNLIMITED=1
// for the old "test account stays in trial forever" behaviour.
export const TRIAL_DAYS =
  Number(process.env.TRIAL_DAYS) > 0
    ? Number(process.env.TRIAL_DAYS)
    : process.env.AI_TEST_UNLIMITED === '1'
      ? 3650
      : 14

// Within the trial, the first couple of days run photo scans on the sharper
// (pricier) Sonnet model — that's when people actively try the app and form
// their first impression. After that the trial drops to the faster, cheaper
// Haiku for the rest of the week, to keep costs down while we wait to see if
// they convert. Chat and receipts always use Haiku regardless. Tune the window
// with TRIAL_PREMIUM_HOURS (default 48 = 2 days).
export const TRIAL_PREMIUM_HOURS = Number(process.env.TRIAL_PREMIUM_HOURS) || 48

// Anti-farm: how many trial accounts ONE device may start (within a recent
// window) before further new accounts on that device begin on the free tier
// instead of getting another 14-day trial. A couple is allowed so a shared
// household device isn't punished. Disabled on staging/preview (GENEROUS) so
// testing lots of accounts isn't blocked. Tune with TRIAL_DEVICE_LIMIT.
export const TRIAL_DEVICE_LIMIT = Number(process.env.TRIAL_DEVICE_LIMIT) || 2

// Emails that are NEVER trial-blocked, however many accounts share their device
// — for the owner's own test accounts. Comma-separated, set in TRIAL_BYPASS_EMAILS.
const TRIAL_BYPASS = new Set(
  (process.env.TRIAL_BYPASS_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
)

// Work out a user's effective plan: paid Plus, a Plus trial (first TRIAL_DAYS), or
// Free. Trial is derived from when their profile was created, so no extra state
// to manage. `trialPremium` marks the early-trial window that gets the sharper
// vision model. Returns { tier, paid, trial, trialDaysLeft, trialPremium }.
export function effectivePlan(profile, opts = {}) {
  const tier = profile?.tier || 'free'
  if (tier === 'plus') return { tier: 'plus', paid: true, trial: false, trialDaysLeft: 0, trialPremium: false }
  const created = profile?.created_at ? Date.parse(profile.created_at) : NaN
  if (!Number.isNaN(created)) {
    const ageMs = Date.now() - created
    const msLeft = created + TRIAL_DAYS * 86400000 - Date.now()
    // `trialBlocked` = this device already used its trial allowance, so a fresh
    // email here doesn't earn another trial — the account just starts on Free.
    if (msLeft > 0 && !opts.trialBlocked) {
      return {
        tier: 'plus',
        paid: false,
        trial: true,
        trialDaysLeft: Math.ceil(msLeft / 86400000),
        trialPremium: ageMs < TRIAL_PREMIUM_HOURS * 3600000
      }
    }
  }
  return { tier: 'free', paid: false, trial: false, trialDaysLeft: 0, trialPremium: false }
}

// Which vision (photo-scan) model a plan gets. Paid Plus and the early-trial
// premium window get the sharper Sonnet; everyone else (later trial + Free)
// gets the faster, cheaper Haiku.
export function visionModelFor(plan) {
  if (!plan) return HAIKU
  if (plan.paid) return SONNET
  if (plan.trial && plan.trialPremium) return SONNET
  return HAIKU
}

// Verify the bearer token and load the user's plan. Returns
// { user, tier, plan } on success, or { error: {status, body} } to forward.
export async function authenticate(token, ctx = {}) {
  if (!authEnabled()) return { user: null, tier: 'free', skipped: true }
  if (!token) return { error: UNAUTHENTICATED }

  const db = admin()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return { error: UNAUTHENTICATED }
  const user = data.user

  let profile = null
  try {
    const r = await db.from('profiles').select('tier, created_at, device_id').eq('id', user.id).single()
    profile = r.data
  } catch {
    /* profile row may not exist yet — treat as a fresh free account */
  }
  // Anchor the trial to the real signup moment: the auth user's created_at is
  // set the instant they register, so the countdown always starts at sign-up.
  const signupDate = user.created_at || profile?.created_at

  // Stamp the device fingerprint + signup IP onto the profile the first time we
  // see them (only /api/me passes ctx). Best-effort: if the columns aren't there
  // yet the anti-abuse simply stays off — nothing breaks.
  let deviceId = profile?.device_id || null
  if (!deviceId && ctx.deviceId) {
    deviceId = String(ctx.deviceId).slice(0, 120)
    try {
      await db
        .from('profiles')
        .update({ device_id: deviceId, signup_ip: ctx.ip ? String(ctx.ip).slice(0, 100) : null })
        .eq('id', user.id)
    } catch {
      /* columns missing — leave anti-abuse off */
    }
  }

  // Light anti-farm: count this device's accounts from the last 90 days, up to
  // and including this one. Past the limit, this account doesn't get the premium
  // trial (it starts on Free). Off on staging/preview, and fails open on error.
  let trialBlocked = false
  const bypass = TRIAL_BYPASS.has((user.email || '').toLowerCase())
  if (!GENEROUS && deviceId && !bypass) {
    try {
      const windowStart = new Date(Date.now() - 90 * 86400000).toISOString()
      const { count } = await db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', deviceId)
        .gte('created_at', windowStart)
        .lte('created_at', profile?.created_at || signupDate)
      if (typeof count === 'number' && count > TRIAL_DEVICE_LIMIT) trialBlocked = true
    } catch {
      /* fail open — never lock a real user out over an anti-abuse query */
    }
  }

  const plan = effectivePlan({ tier: profile?.tier, created_at: signupDate }, { trialBlocked })
  return { user, tier: plan.tier, plan }
}

// How many of `kind` this user has used since a given timestamp.
export async function usageSince(userId, kind, sinceISO) {
  const { count } = await admin()
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', sinceISO)
  return count || 0
}

// How many of `kind` this user has used this calendar month.
export async function usageThisPeriod(userId, kind) {
  return usageSince(userId, kind, periodStart())
}

// Record one successful AI call.
export async function recordUsage(userId, kind) {
  try {
    const { error } = await admin().from('ai_usage').insert({ user_id: userId, kind })
    // A non-throwing error here almost always means the SERVICE_ROLE key isn't
    // really the service_role key (so RLS blocks the write). Surface it loudly.
    if (error) console.error('Could not record usage (check SUPABASE_SERVICE_ROLE_KEY):', error.message)
  } catch (err) {
    console.error('Could not record usage:', err?.message || err)
    // Non-fatal: never fail a successful AI call just because logging hiccupped.
  }
}

// Reserve a usage slot by inserting the row up front (returns its id), so the
// quota check below counts it. This makes concurrent requests race-safe: each
// sees the other's reservation instead of all reading a stale count. If the
// call is then rejected or fails, we refund (delete) the row.
export async function reserveUsage(userId, kind) {
  try {
    const { data, error } = await admin().from('ai_usage').insert({ user_id: userId, kind }).select('id').single()
    if (error) {
      console.error('Could not reserve usage (check SUPABASE_SERVICE_ROLE_KEY):', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('Could not reserve usage:', err?.message || err)
    return null
  }
}

export async function refundUsage(id) {
  if (!id) return
  try {
    await admin().from('ai_usage').delete().eq('id', id)
  } catch (err) {
    console.error('Could not refund usage:', err?.message || err)
  }
}

// Full gate used by the handlers: authenticate + quota check. On success
// returns { user, tier, visionModel }. On failure returns { error }.
// In open mode (no Supabase) it returns the legacy defaults and skips metering.
export async function guard(token, kind) {
  const auth = await authenticate(token)
  if (auth.error) return auth
  if (auth.skipped) {
    // Open mode: original behaviour, Sonnet vision, no metering.
    return { user: null, tier: 'open', visionModel: SONNET, meter: false, plan: { tier: 'open', paid: true, trial: false, trialDaysLeft: 0, trialPremium: true } }
  }
  const monthlyLimit = quotaDecision(auth.tier, kind, 0).limit
  const dailyLimit = DAILY[kind] ?? Infinity

  // Reserve first, then count with our own reservation included — race-safe.
  const usageId = await reserveUsage(auth.user.id, kind)
  const [usedMonth, usedDay] = await Promise.all([
    usageSince(auth.user.id, kind, periodStart()),
    usageSince(auth.user.id, kind, dayStart())
  ])
  if (usedMonth > monthlyLimit) {
    await refundUsage(usageId)
    return { error: overQuotaResponse(kind, { limit: monthlyLimit, used: monthlyLimit }) }
  }
  if (usedDay > dailyLimit) {
    await refundUsage(usageId)
    return { error: dailyLimitResponse(kind, dailyLimit) }
  }
  // The slot is already recorded; the handler refunds usageId if the call fails.
  // Vision model depends on the plan (trial premium window vs. not), not just tier.
  // `plan` rides along so Plus-only handlers (e.g. the how-to walkthrough) can
  // gate without a second authenticate() round-trip.
  return { user: auth.user, tier: auth.tier, visionModel: visionModelFor(auth.plan), meter: true, usageId, plan: auth.plan }
}

// Account summary for the client (tier + this month's usage vs limits).
export async function accountSummary(token, ctx) {
  const auth = await authenticate(token, ctx)
  if (auth.error) return auth
  if (auth.skipped) {
    return { status: 200, body: { authEnabled: false } }
  }
  const cfg = tierConfig(auth.tier)
  const plan = auth.plan || { tier: auth.tier, paid: auth.tier === 'plus', trial: false, trialDaysLeft: 0 }
  const [scans, chats] = await Promise.all([
    usageThisPeriod(auth.user.id, 'vision'),
    usageThisPeriod(auth.user.id, 'chat')
  ])
  return {
    status: 200,
    body: {
      authEnabled: true,
      email: auth.user.email,
      tier: auth.tier,
      paid: plan.paid,
      trial: plan.trial,
      trialDaysLeft: plan.trialDaysLeft,
      tierLabel: plan.paid ? 'Plus' : plan.trial ? 'Plus trial' : 'Free',
      usage: {
        scans: { used: scans, limit: cfg.scansPerMonth },
        chats: { used: chats, limit: cfg.chatsPerMonth }
      }
    }
  }
}

// Permanently delete the signed-in user and all their data. We clear their rows
// explicitly (belt-and-braces) and then delete the auth user itself, which also
// cascades any remaining rows via the tables' on-delete-cascade foreign keys.
export async function deleteAccountHandler(token) {
  if (!authEnabled()) {
    return { status: 400, body: { error: 'no_accounts', message: 'Accounts are not enabled.' } }
  }
  const auth = await authenticate(token)
  if (auth.error) return auth.error

  const db = admin()
  const uid = auth.user.id
  try {
    await Promise.all([
      db.from('items').delete().eq('user_id', uid),
      db.from('shopping_items').delete().eq('user_id', uid),
      db.from('staple_prefs').delete().eq('user_id', uid),
      db.from('saved_meals').delete().eq('user_id', uid),
      db.from('ai_usage').delete().eq('user_id', uid)
    ])
    await db.from('profiles').delete().eq('id', uid)
    const { error } = await db.auth.admin.deleteUser(uid)
    if (error) throw new Error(error.message)
    return { status: 200, body: { ok: true } }
  } catch (err) {
    console.error('account delete failed:', err?.message || err)
    return { status: 500, body: { error: 'delete_failed', message: 'Could not delete the account. Please try again.' } }
  }
}
