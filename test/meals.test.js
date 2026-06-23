import { describe, it, expect, beforeEach } from 'vitest'
import { savedMeals } from '../src/lib/meals.js'

const M = { serves: 2, time: '30 mins', ingredients: ['rice'], steps: ['stir', 'serve'] }

describe('saved-meal walkthrough reuse (no second credit)', () => {
  beforeEach(() => savedMeals.clear())

  it('reuses a method cached by dish name (case-insensitive)', () => {
    expect(savedMeals.methodFor('Risotto')).toBe(null)
    savedMeals.rememberMethod('Risotto', M)
    expect(savedMeals.methodFor('risotto')?.steps?.length).toBe(2)
  })

  it('finds a method even when the meal was saved without one (save-first order)', () => {
    const rec = savedMeals.add({ name: 'Tomato Pasta', description: '', uses: [], buy: [] })
    expect(savedMeals.methodFor('Tomato Pasta')).toBe(null) // saved, no how-to yet
    savedMeals.rememberMethod('Tomato Pasta', M) // how-to generated later
    expect(savedMeals.methodFor('tomato pasta')?.steps?.length).toBe(2)
    savedMeals.remove(rec.id)
  })

  it('ignores empty/invalid methods', () => {
    savedMeals.rememberMethod('Soup', { steps: [] })
    expect(savedMeals.methodFor('Soup')).toBe(null)
  })

  it('clears the cache on account change', () => {
    savedMeals.rememberMethod('Curry', M)
    savedMeals.clear()
    expect(savedMeals.methodFor('Curry')).toBe(null)
  })
})
