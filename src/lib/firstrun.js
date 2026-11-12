// Per-account "seen" flags for first-run guidance (walkthrough, install nudge,
// dinner coach tips). Namespacing the localStorage key by the signed-in user id
// means a freshly created account gets the full first-run experience again —
// even on a browser that's already seen it. Falls back to 'local' in open mode.

function key(base, uid) {
  return `${base}.${uid || 'local'}`
}

export function seen(base, uid) {
  try {
    return localStorage.getItem(key(base, uid)) === '1'
  } catch {
    return false // private mode: treat as unseen, don't crash
  }
}

export function markSeen(base, uid) {
  try {
    localStorage.setItem(key(base, uid), '1')
  } catch {
    /* private mode — it'll just show again next time */
  }
}

export function clearSeen(base, uid) {
  try {
    localStorage.removeItem(key(base, uid))
  } catch {
    /* private mode */
  }
}

// Remember when something happened (e.g. the install guide was first closed),
// so a reminder can wait a few days.
export function markNow(base, uid) {
  try {
    localStorage.setItem(key(base, uid), String(Date.now()))
  } catch {
    /* private mode */
  }
}

// Whole days since markNow, or 0 if it never ran.
export function daysSince(base, uid, now = Date.now()) {
  try {
    const t = Number(localStorage.getItem(key(base, uid)))
    return t > 0 ? Math.floor((now - t) / 86_400_000) : 0
  } catch {
    return 0
  }
}
