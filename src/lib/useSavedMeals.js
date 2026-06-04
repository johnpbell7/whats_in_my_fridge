import { useSyncExternalStore } from 'react'
import { savedMeals } from './meals.js'

export function useSavedMeals() {
  return useSyncExternalStore(savedMeals.subscribe, savedMeals.getAll, savedMeals.getAll)
}
