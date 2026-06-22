import { useSyncExternalStore } from 'react'
import { getMe } from './api.js'

// Reactive account/entitlements store. Wraps getMe() so the whole UI can gate
// Plus features (the shopping list + fridge tracking) off one shared source,
// without every component re-fetching. In "open" mode (accounts switched off)
// everything is unlocked.

let state = {
  loaded: false,
  authEnabled: true,
  tier: 'free',
  paid: false,
  trial: false,
  trialDaysLeft: 0,
  usage: null
}
const subs = new Set()
const emit = () => subs.forEach((f) => f())

export const me = {
  subscribe(f) {
    subs.add(f)
    return () => subs.delete(f)
  },
  get: () => state,
  // Plus access = paying, on the trial, or running in open (no-accounts) mode.
  isPlus: () => state.authEnabled === false || state.paid || state.trial,

  async load() {
    try {
      const m = await getMe()
      if (m && m.authEnabled === false) {
        state = { loaded: true, authEnabled: false, tier: 'open', paid: true, trial: false, trialDaysLeft: 0, usage: null }
      } else if (m) {
        state = {
          loaded: true,
          authEnabled: true,
          tier: m.tier || 'free',
          paid: !!m.paid,
          trial: !!m.trial,
          trialDaysLeft: m.trialDaysLeft || 0,
          usage: m.usage || null
        }
      }
      emit()
    } catch {
      // Leave the previous state. Defaulting to "free" keeps the gate
      // conservative (locked) rather than leaking Plus features on a hiccup.
    }
  },

  clear() {
    state = { loaded: false, authEnabled: true, tier: 'free', paid: false, trial: false, trialDaysLeft: 0, usage: null }
    emit()
  }
}

export function useMe() {
  return useSyncExternalStore(me.subscribe, me.get, me.get)
}

export function useIsPlus() {
  const s = useMe()
  return s.authEnabled === false || s.paid || s.trial
}
