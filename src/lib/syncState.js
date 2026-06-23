// Tracks whether cloud sync is currently healthy, so the UI can show an
// "offline / not synced" indicator instead of silently pretending everything
// saved. cloud.js reports success/failure here; the app subscribes to it.
//
//   'ok'      — last cloud write/pull succeeded (or we're not syncing)
//   'offline' — the browser reports no connection
//   'error'   — we're online but a cloud write/pull failed
//
// Either non-ok state means "your changes are safe on this device but haven't
// reached the cloud yet" — never data loss, just not-yet-synced.

const listeners = new Set()
let status = 'ok'
let retryFn = null

function set(next) {
  if (next === status) return
  status = next
  listeners.forEach((fn) => fn())
}

export const syncStatus = {
  get: () => status,
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  // Reported by cloud.js on every write/pull.
  ok() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) set('offline')
    else set('ok')
  },
  fail() {
    set(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')
  },
  // cloud.js registers how to re-run sync so the indicator's "Retry" works.
  setRetry(fn) {
    retryFn = fn
  },
  retry() {
    return retryFn?.()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => set('offline'))
  window.addEventListener('online', () => {
    // Back online — assume recovered and kick a re-sync to flush local changes.
    set('ok')
    retryFn?.()
  })
}
