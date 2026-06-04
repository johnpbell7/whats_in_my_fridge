import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

// Tracks the signed-in session. In open mode (no Supabase) it reports enabled:
// false and the app skips the login gate entirely.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(supabaseEnabled)

  useEffect(() => {
    if (!supabaseEnabled) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return { enabled: supabaseEnabled, loading, session, user: session?.user || null }
}
