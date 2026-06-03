import { useSyncExternalStore } from 'react'
import { store } from './store.js'

// React binding for the store. Components re-render when the inventory changes,
// from anywhere — manual edits, photo confirms, cross-tab syncs.
export function useItems() {
  return useSyncExternalStore(store.subscribe, store.getAll, store.getAll)
}
