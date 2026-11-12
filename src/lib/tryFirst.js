// "Try it first": the list from a photo taken before signing up is kept on the
// device, then added to the new account's fridge once they're in. Also notes
// whether this device has ever signed in, so first-time visitors land on the
// "try it" welcome rather than "Welcome back".

const PENDING = 'fridge.tryItems'
const SIGNED_IN = 'fridge.hasSignedIn'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // a week-old photo isn't today's fridge

export function savePending(items) {
  try {
    localStorage.setItem(PENDING, JSON.stringify({ items, at: Date.now() }))
  } catch {
    /* private mode: they'll just scan again once signed in */
  }
}

// Hand the saved list over once (and forget it), or [] if there isn't one.
export function takePending(now = Date.now()) {
  try {
    const raw = localStorage.getItem(PENDING)
    localStorage.removeItem(PENDING)
    const saved = raw ? JSON.parse(raw) : null
    if (!saved || !Array.isArray(saved.items) || now - (saved.at || 0) > MAX_AGE_MS) return []
    return saved.items.filter((it) => it && typeof it.name === 'string' && it.name.trim())
  } catch {
    return []
  }
}

export function pendingCount() {
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING) || 'null')
    return Array.isArray(saved?.items) ? saved.items.length : 0
  } catch {
    return 0
  }
}

export function hasSignedInBefore() {
  try {
    return localStorage.getItem(SIGNED_IN) === '1' || !!localStorage.getItem('fridge.lastUser')
  } catch {
    return false
  }
}

export function markSignedIn() {
  try {
    localStorage.setItem(SIGNED_IN, '1')
  } catch {
    /* private mode */
  }
}
