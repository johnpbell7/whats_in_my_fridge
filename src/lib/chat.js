// Chat history persistence — keeps the Ask conversation across tab switches and
// app reloads. Local-only (not cloud-synced), and cleared on account change so
// one account's conversation never shows under another. Small + capped, mirrored
// to localStorage like the other lightweight stores.

const LS_KEY = 'fridge.chat.v1'
const MAX = 60 // keep the last N messages so storage stays small

const listeners = new Set()

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

let cache = read()

function notify() {
  listeners.forEach((fn) => fn())
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* private mode — history just won't persist */
  }
}

export const chat = {
  getAll: () => cache,

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  // Replace the whole conversation (the screen builds the next array and sets it).
  // Give every message a stable id so React can key on it — keying on array
  // index breaks enter/exit animations once the list is sliced to the last MAX.
  setAll(messages) {
    const next = Array.isArray(messages) ? messages.slice(-MAX) : []
    for (const m of next) {
      if (m && m.id == null) m.id = `m-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    cache = next
    persist()
    notify()
  },

  clear() {
    cache = []
    persist()
    notify()
  }
}
