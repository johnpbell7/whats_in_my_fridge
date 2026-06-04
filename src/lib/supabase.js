// Supabase browser client. Reads the public URL + anon key from build-time env
// (VITE_ prefixed, so they're safe to ship to the browser). If they're not set,
// the app runs in its original single-user "open" mode with no accounts.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseEnabled = Boolean(url && anon)
export const supabase = supabaseEnabled ? createClient(url, anon) : null

// Authorization header carrying the signed-in user's access token, for /api
// calls. Empty in open mode (or when signed out).
export async function authHeader() {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
