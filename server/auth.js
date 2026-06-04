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

// Per-tier limits and which vision model they get. Chat always uses the cheap
// model. Tune these to your unit economics — see SETUP_ACCOUNTS.md.
export const TIERS = {
  free: { label: 'Free', visionModel: HAIKU, scansPerMonth: 5, chatsPerMonth: 15 },
  plus: { label: 'Plus', visionModel: SONNET, scansPerMonth: 300, chatsPerMonth: 1000 }
}

export const tierConfig = (tier) => TIERS[tier] || TIERS.free

export function authEnabled() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)
}

// One admin client (service role) — bypasses row-level security for the
// server's own reads/writes. Created lazily so importing this file is cheap.
let _admin
function admin() {
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

// Pure quota decision, separated out so it can be unit-tested without a DB.
// kind is 'vision' | 'chat'. Returns { allowed, limit, used }.
export function quotaDecision(tier, kind, used) {
  const cfg = tierConfig(tier)
  const limit = kind === 'vision' ? cfg.scansPerMonth : cfg.chatsPerMonth
  return { allowed: used < limit, limit, used }
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

// Verify the bearer token and load the user's tier. Returns
// { user, tier } on success, or { error: {status, body} } to forward.
export async function authenticate(token) {
  if (!authEnabled()) return { user: null, tier: 'free', skipped: true }
  if (!token) return { error: UNAUTHENTICATED }

  const db = admin()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return { error: UNAUTHENTICATED }
  const user = data.user

  const { data: profile } = await db.from('profiles').select('tier').eq('id', user.id).single()
  return { user, tier: profile?.tier || 'free' }
}

// How many of `kind` this user has used since the period start.
export async function usageThisPeriod(userId, kind) {
  const { count } = await admin()
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', periodStart())
  return count || 0
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

// Full gate used by the handlers: authenticate + quota check. On success
// returns { user, tier, visionModel }. On failure returns { error }.
// In open mode (no Supabase) it returns the legacy defaults and skips metering.
export async function guard(token, kind) {
  const auth = await authenticate(token)
  if (auth.error) return auth
  if (auth.skipped) {
    // Open mode: original behaviour, Sonnet vision, no metering.
    return { user: null, tier: 'open', visionModel: SONNET, meter: false }
  }
  const used = await usageThisPeriod(auth.user.id, kind)
  const decision = quotaDecision(auth.tier, kind, used)
  if (!decision.allowed) return { error: overQuotaResponse(kind, decision) }
  return { user: auth.user, tier: auth.tier, visionModel: tierConfig(auth.tier).visionModel, meter: true }
}

// Account summary for the client (tier + this month's usage vs limits).
export async function accountSummary(token) {
  const auth = await authenticate(token)
  if (auth.error) return auth
  if (auth.skipped) {
    return { status: 200, body: { authEnabled: false } }
  }
  const cfg = tierConfig(auth.tier)
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
      tierLabel: cfg.label,
      usage: {
        scans: { used: scans, limit: cfg.scansPerMonth },
        chats: { used: chats, limit: cfg.chatsPerMonth }
      }
    }
  }
}
