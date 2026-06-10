// Thin client for our own serverless API. The browser only ever talks to /api;
// the Anthropic key lives on the server (server/index.js). When accounts are
// enabled, the signed-in user's token rides along so the server can meter use.

import { authHeader, supabase } from './supabase.js'

// Owner/infrastructure failures (no Anthropic credit, bad/missing API key, bad
// model) come back with developer-facing messages meant for the server logs and
// the owner — never show those to a customer. Map them to a calm, generic line;
// everything else keeps its own user-friendly message.
const OWNER_ERROR_CODES = new Set(['no_credit', 'bad_key', 'no_api_key', 'bad_model'])
export function aiErrorMessage(err) {
  if (err && OWNER_ERROR_CODES.has(err.code)) {
    return 'AI features are temporarily unavailable — please try again later.'
  }
  return err?.message || 'Something went wrong. Please try again.'
}

async function post(path, body) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(body)
    })
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    // A 401 means the session token is expired/revoked. Sign out so the app
    // re-gates to the login screen instead of showing a generic error forever.
    if (res.status === 401 && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        /* best-effort */
      }
    }
    const err = new Error(data.message || 'Something went wrong. Please try again.')
    err.code = data.error
    throw err
  }
  return data
}

// Ask about the fridge. Returns a typed result the chat renders as the right
// card: { kind:'meals', meals } | { kind:'dish', result } | { kind:'list',
// title, items } | { kind:'text', answer }. One AI request regardless of kind.
export function askChat(question, inventory) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return post('/api/chat', { question, inventory, today })
}

// Ask for dinner ideas from the current inventory. Returns a list of meals,
// each with the inventory items it uses and a few extra things to buy. This is
// a single chat-model request (same quota/credit as askChat) — the structured
// result just lets the app render meal cards with add-to-shopping buttons.
export function suggestMeals(inventory, request) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return post('/api/meals', { inventory, today, request }).then((d) => d.meals || [])
}

// "I want to make X" — returns { dish, have, need, note }: which of the dish's
// ingredients are already in the fridge and which still need buying. Same
// quota/credit as a chat message.
export function checkDish(dish, inventory) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return post('/api/dish', { dish, inventory, today }).then((d) => d.result || null)
}

// Send a photo for recognition. Returns { items, receiptDate } to confirm.
// mode: 'groceries' (a fridge/bag photo) or 'receipt' (a till receipt).
// receiptDate is the date read off a receipt (YYYY-MM-DD) or null.
export function detectFromImage(imageBase64, mediaType, mode = 'groceries') {
  return post('/api/vision', { imageBase64, mediaType, mode }).then((d) => ({
    items: d.items || [],
    receiptDate: d.receiptDate || null
  }))
}

// Send a "report a problem" message to support (emails it to the owner).
export function reportProblem(type, message) {
  let meta = ''
  try {
    meta = `${navigator.userAgent} · ${location.href}`
  } catch {
    /* non-browser */
  }
  return post('/api/report', { type, message, meta })
}

// Permanently delete the signed-in user's account and all their data.
export function deleteAccount() {
  return post('/api/delete-account', {})
}

// Start a Stripe subscription checkout — returns { url } to redirect to.
export function startCheckout() {
  return post('/api/checkout', {})
}

// After returning from checkout, confirm the session and grant Plus.
export function confirmCheckout(sessionId) {
  return post('/api/checkout-confirm', { session_id: sessionId })
}

// Open the Stripe billing portal (manage / cancel) — returns { url }.
export function openBillingPortal() {
  return post('/api/billing-portal', {})
}

export function getHealth() {
  return fetch('/api/health').then((r) => r.json()).catch(() => ({ ok: false, hasKey: false }))
}

// The signed-in user's tier + this month's usage (or { authEnabled: false }).
// no-store so the count is always live, never a cached value.
export async function getMe() {
  let res
  try {
    res = await fetch('/api/me', { headers: { ...(await authHeader()) }, cache: 'no-store' })
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  if (!res.ok) {
    // Mirror post()'s 401 handling so an expired token re-gates to login rather
    // than surfacing an unparsed 5xx page as a confusing error.
    if (res.status === 401 && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        /* best-effort */
      }
    }
    throw new Error('Could not load your account.')
  }
  return res.json()
}
