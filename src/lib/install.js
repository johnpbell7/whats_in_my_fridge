// Home-screen install helpers. We capture Android/Chrome's `beforeinstallprompt`
// event (so we can fire the real native install dialog), and expose simple
// platform/standalone detection used by the InstallGuide sheet.
let deferred = null
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  // Chrome fires this when the app is installable; stash it so we can prompt
  // later from a user gesture (the browser only lets us call .prompt() once).
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

// Running as an installed PWA (no browser chrome)? Then there's nothing to do.
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function platform() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  // iPadOS 13+ reports as Mac, so sniff touch points too.
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  return 'other'
}

// Treat real phones/tablets as mobile; this is what gates the auto-popup.
export function isMobile() {
  if (typeof window === 'undefined') return false
  return platform() !== 'other' || window.matchMedia?.('(max-width: 820px)').matches
}

// True only on browsers that gave us a real install event (Android/Chrome).
export function canPrompt() {
  return !!deferred
}

// Fire the native Android install dialog. Returns 'accepted' | 'dismissed' |
// 'unavailable'. Must be called from a user gesture.
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  if (outcome === 'accepted') deferred = null
  emit()
  return outcome
}

export function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
