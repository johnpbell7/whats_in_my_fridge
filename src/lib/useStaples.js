import { useMemo, useSyncExternalStore } from 'react'
import { staplePrefs, computeStaples } from './staples.js'

// React binding for the pin/dismiss preferences.
export function useStaplePrefs() {
  return useSyncExternalStore(staplePrefs.subscribe, staplePrefs.getAll, staplePrefs.getAll)
}

// Derive staples (and the missing subset) from the inventory, re-running when
// either the items or the user's preferences change.
export function useStaples(items) {
  const prefs = useStaplePrefs()
  return useMemo(() => computeStaples(items, prefs), [items, prefs])
}
