import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initMonitoring } from './lib/monitoring.js'
import { Analytics } from './lib/analytics.js'
import './index.css'

// Start error monitoring (no-op unless VITE_SENTRY_DSN is configured).
initMonitoring()

// Auto-update to the latest deploy. The service worker (skipWaiting +
// clientsClaim) activates a new build immediately; on top of that we poll for
// updates and re-check whenever the app regains focus, so a long-open or
// reopened session picks up new versions on its own — no reinstall needed.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    if (!reg) return
    const check = () => reg.update().catch(() => {})
    setInterval(check, 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  }
})

// If anything in the app throws, show a simple reload screen rather than a
// blank page — and never get stuck on a stale state.
function Fallback() {
  return (
    <div className="crash">
      <h1>
        Fridge<span style={{ color: 'var(--accent)' }}>.</span>
      </h1>
      <p>Something went wrong loading the app.</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<Fallback />}>
      <App />
      <Analytics />
    </ErrorBoundary>
  </React.StrictMode>
)
