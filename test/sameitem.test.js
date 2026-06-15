import { describe, it, expect } from 'vitest'
import { sameItem } from '../src/lib/staples.js'

describe('sameItem (scan de-dup matcher)', () => {
  it('matches the same item across spelling/plurals/case', () => {
    expect(sameItem('Milk', 'milk')).toBe(true)
    expect(sameItem('Eggs', 'egg')).toBe(true)
    expect(sameItem('  Cheddar ', 'cheddar')).toBe(true)
  })

  it('matches when one name is a fuller version of the other', () => {
    expect(sameItem('Milk', 'Whole milk')).toBe(true)
    expect(sameItem('Free range eggs', 'Eggs')).toBe(true)
    expect(sameItem('Cherry tomatoes', 'Tomatoes')).toBe(true)
  })

  it('does NOT match merely-related but different items', () => {
    expect(sameItem('Chicken breast', 'Chicken thigh')).toBe(false)
    expect(sameItem('Red pepper', 'Black pepper')).toBe(false)
    expect(sameItem('Milk', 'Bread')).toBe(false)
  })

  it('is empty-safe', () => {
    expect(sameItem('', 'Milk')).toBe(false)
    expect(sameItem('Milk', '')).toBe(false)
  })
})
