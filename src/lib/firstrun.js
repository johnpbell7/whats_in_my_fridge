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
