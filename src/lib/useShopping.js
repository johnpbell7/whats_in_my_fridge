import { useSyncExternalStore } from 'react'
import { shopping } from './shopping.js'

export function useShopping() {
  return useSyncExternalStore(shopping.subscribe, shopping.getAll, shopping.getAll)
}
