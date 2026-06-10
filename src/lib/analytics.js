// Vercel Web Analytics — cookieless and privacy-friendly (no consent banner
// needed). The <Analytics /> component records pageviews; track() records the
// conversion events we care about (signups, upgrades). All of it is dormant
// until you enable Web Analytics for the project in the Vercel dashboard
// (Project → Analytics → Enable) — until then these calls are harmless no-ops.

import { track as vercelTrack } from '@vercel/analytics'

export { Analytics } from '@vercel/analytics/react'

// Wrapped so analytics can never throw into the app.
export function track(name, props) {
  try {
    vercelTrack(name, props)
  } catch {
    /* analytics must never break the app */
  }
}
