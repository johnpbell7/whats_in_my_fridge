// Global "show the upgrade sheet" trigger, so a hit cap or a locked feature
// anywhere can open the Plus paywall with the right context. Rendered once by
// <UpgradeGate /> near the app root.

const listeners = new Set()
let state = null // null = closed, or { reason }

function emit() {
  listeners.forEach((fn) => fn())
}

export const upgrade = {
  // reason: 'scans' | 'chat' | 'rate' | 'account' (drives the headline)
  show(reason = '') {
    state = { reason }
    emit()
  },
  close() {
    state = null
    emit()
  },
  get: () => state,
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
}
