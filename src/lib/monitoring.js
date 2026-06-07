// Optional error monitoring (Sentry). It activates ONLY when VITE_SENTRY_DSN is
// set, and the SDK is lazy-loaded so it never bloats the bundle for anyone who
// hasn't turned it on. Best-effort throughout — monitoring must never break the
// app it's watching.
let capture = null

export async function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Errors only — no performance tracing or session replay by default, to
      // keep it light and within free quota. Turn these up later if wanted.
      tracesSampleRate: 0
    })
    capture = (err, ctx) => Sentry.captureException(err, ctx ? { extra: ctx } : undefined)
  } catch {
    /* couldn't load Sentry — carry on without monitoring */
  }
}

// Report a caught error (e.g. from the ErrorBoundary). No-op until init runs.
export function captureError(err, ctx) {
  try {
    capture?.(err, ctx)
  } catch {
    /* ignore */
  }
}
