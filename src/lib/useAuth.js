import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

// Tracks the signed-in session. In open mode (no Supabase) it reports enabled:
// false and the app skips the login gate entirely.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(supabaseEnabled)
  // True after the user follows a password-reset link — the app shows the
  // "set a new password" screen until they finish (or it's cleared).
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabaseEnabled) return
    // Always clear `loading`, even if getSession rejects (network blip / corrupt
    // stored session) — otherwise the app hangs on a permanently blank screen.
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return {
    enabled: supabaseEnabled,
    loading,
    session,
    user: session?.user || null,
    recovery,
    clearRecovery: () => setRecovery(false)
  }
}
