// Vercel Web Analytics — cookieless and privacy-friendly (no consent banner
// needed). The <Analytics /> component records pageviews; track() records the
// conversion events we care about (signups, upgrades). All of it is dormant
// until you enable Web Analytics for the project in the Vercel dashboard
// (Project → Analytics → Enable) — until then these calls are harmless no-ops.

import { track as vercelTrack } from '@vercel/analytics'

export { Analytics } from '@vercel/analytics/react'

// Map our internal event names to Meta Pixel standard events, so Instagram/
// Facebook ad campaigns can optimise toward real conversions. The Pixel only
// fires if it's been configured (a Pixel ID set in index.html); otherwise
// window.fbq doesn't exist and these are silent no-ops.
const FB_EVENTS = {
  signup: 'CompleteRegistration',
  upgrade_started: 'InitiateCheckout',
  subscribed: 'Subscribe',
}

function fbTrack(name, props) {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
    const mapped = FB_EVENTS[name]
    // give the paid conversion a value so the ad system can report ROAS
    const params = name === 'subscribed' ? { currency: 'GBP', value: 3.99, ...props } : props
    if (mapped) window.fbq('track', mapped, params)
    else window.fbq('trackCustom', name, props)
  } catch {
    /* analytics must never break the app */
  }
}

// Wrapped so analytics can never throw into the app.
export function track(name, props) {
  try {
    vercelTrack(name, props)
  } catch {
    /* analytics must never break the app */
  }
  fbTrack(name, props)
}
