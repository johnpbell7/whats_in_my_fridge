// Where a visitor came from, for printed and on-screen QR codes.
//
// Every QR code points at its own short address, /qr/<code> (home, flyer,
// poster…). vercel.json forwards that to /?utm_source=qr&utm_campaign=<code>;
// if the app is already installed, the service worker serves the app at
// /qr/<code> instead. Both are read here, so a scan is counted either way.
//
// The first code someone arrives on is remembered on the device, and added to
// the signup / upgrade / subscribed events, so Vercel Analytics can show
// "flyer: 40 scans, 9 sign-ups, 2 paying". The address is then tidied back to
// "/" so a home-screen bookmark doesn't count as a scan every time it opens.

const KEY = 'fridge.source'
let pending = null

// Codes are short, lower-case words: anything else is ignored.
export function cleanCode(raw) {
  const code = String(raw || '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(code) ? code : null
}

// Pull the QR code (if any) out of a URL. Returns { code, url } where url is
// the tidied address to show instead, or null when the URL isn't a QR visit.
export function readQr(href) {
  let u
  try {
    u = new URL(href)
  } catch {
    return null
  }
  let code = null
  const m = u.pathname.match(/^\/qr\/([^/]+)\/?$/)
  if (m) code = cleanCode(decodeURIComponent(m[1]))
  else if (u.searchParams.get('utm_source') === 'qr') code = cleanCode(u.searchParams.get('utm_campaign'))
  if (!code && !m && u.searchParams.get('utm_source') !== 'qr') return null
  for (const p of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) u.searchParams.delete(p)
  const path = m ? '/' : u.pathname
  const qs = u.searchParams.toString()
  return { code, url: path + (qs ? `?${qs}` : '') + u.hash }
}

// Run once, before the app renders: remember the code and tidy the address.
export function captureSource() {
  try {
    const hit = readQr(window.location.href)
    if (!hit) return
    if (hit.code) {
      pending = hit.code
      if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify({ code: hit.code, at: new Date().toISOString() }))
    }
    window.history.replaceState(window.history.state, '', hit.url)
  } catch {
    /* private mode or an odd URL: never stop the app loading */
  }
}

// The scan to report, handed out once (analytics is ready by then).
export function takePendingScan() {
  const code = pending
  pending = null
  return code
}

// The first QR code this device arrived on, or null.
export function firstSource() {
  try {
    return cleanCode(JSON.parse(localStorage.getItem(KEY) || 'null')?.code)
  } catch {
    return null
  }
}
