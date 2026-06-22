import { useSyncExternalStore } from 'react'

// Remembers the last "what's for dinner?" result so it survives leaving the
// Tonight tab (the screen unmounts when you switch tabs). Stored per account in
// localStorage and surfaced back on the Tonight screen as "your last dinner".
//
// We keep the meal ideas + the items they came from + the chosen cuisine, but
// NOT the photo itself (a base64 image would bloat localStorage) — the value is
// the ideas, which we can re-show instantly.

let uid = 'local'
let data = null
const subs = new Set()

function storeKey() {
  return `fridge.dinner.last.${uid}`
}

function load() {
  try {
    const raw = localStorage.getItem(storeKey())
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }
  emit()
}

function emit() {
  subs.forEach((f) => f())
}

export const dinnerLast = {
  subscribe(f) {
    subs.add(f)
    return () => subs.delete(f)
  },
  get: () => data, // stable reference between writes — safe for useSyncExternalStore
  // Point the store at an account (called when the session resolves / changes).
  setAccount(id) {
    const next = id || 'local'
    if (next === uid && data !== null) return
    uid = next
    load()
  },
  // Save a fresh result. `items` is a list of name strings; `meals` the ideas.
  save({ items, meals, cuisine }) {
    data = { items: items || [], meals: meals || [], cuisine: cuisine || 'Any', at: Date.now() }
    try {
      localStorage.setItem(storeKey(), JSON.stringify(data))
    } catch {
      /* private mode — keep it in memory for this session */
    }
    emit()
  },
  clear() {
    data = null
    try {
      localStorage.removeItem(storeKey())
    } catch {
      /* private mode */
    }
    emit()
  }
}

export function useDinnerLast() {
  return useSyncExternalStore(dinnerLast.subscribe, dinnerLast.get, dinnerLast.get)
}
