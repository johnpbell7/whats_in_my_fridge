import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

// Tracks the signed-in session. In open mode (no Supabase) it reports enabled:
// false and the app skips the login gate entirely.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(supabaseEnabled)

  useEffect(() => {
    if (!supabaseEnabled) return
    // Always clear `loading`, even if getSession rejects (network blip / corrupt
    // stored session) — otherwise the app hangs on a permanently blank screen.
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { enabled: supabaseEnabled, loading, session, user: session?.user || null }
}
