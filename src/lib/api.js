// Thin client for our own serverless API. The browser only ever talks to /api;
// the Anthropic key lives on the server (server/index.js). When accounts are
// enabled, the signed-in user's token rides along so the server can meter use.

import { authHeader } from './supabase.js'

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
    const err = new Error(data.message || 'Something went wrong. Please try again.')
    err.code = data.error
    throw err
  }
  return data
}

// Ask a question about the current inventory.
export function askChat(question, inventory) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return post('/api/chat', { question, inventory, today }).then((d) => d.answer)
}

// Ask for dinner ideas from the current inventory. Returns a list of meals,
// each with the inventory items it uses and a few extra things to buy. This is
// a single chat-model request (same quota/credit as askChat) — the structured
// result just lets the app render meal cards with add-to-shopping buttons.
export function suggestMeals(inventory) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  return post('/api/meals', { inventory, today }).then((d) => d.meals || [])
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

export function getHealth() {
  return fetch('/api/health').then((r) => r.json()).catch(() => ({ ok: false, hasKey: false }))
}

// The signed-in user's tier + this month's usage (or { authEnabled: false }).
// no-store so the count is always live, never a cached value.
export async function getMe() {
  const res = await fetch('/api/me', { headers: { ...(await authHeader()) }, cache: 'no-store' })
  return res.json()
}
