// A best-effort device fingerprint for light anti-abuse — spotting one device
// farming many free trials. It is NOT a real device ID (browsers deliberately
// block those); it's a probabilistic hash of stable, already-visible browser
// traits. Used only server-side to gate the premium trial, never shown to the
// user and never asks them for anything. Deliberately storage-independent (no
// localStorage) so clearing data / a fresh browser profile doesn't reset it —
// that's the whole point of catching repeat signups on one device.

function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

let cached = null

export function deviceId() {
  if (cached) return cached
  if (typeof navigator === 'undefined' || typeof screen === 'undefined') return ''
  const traits = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages || []).join(','),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
    navigator.maxTouchPoints || ''
  ].join('|')
  cached = `fp1.${fnv1a(traits)}.${fnv1a(traits.split('').reverse().join(''))}`
  return cached
}
