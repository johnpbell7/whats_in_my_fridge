import { describe, it, expect, beforeEach } from 'vitest'
import { shopping } from '../src/lib/shopping.js'

// The shopping list de-dupes with the same loose grocery matcher as scanning
// (sameItem), so near-identical names don't pile up as separate lines.
describe('shopping list de-dup (sameItem-based)', () => {
  beforeEach(() => shopping.clear())

  it('treats plural/case/fuller variants as already on the list', () => {
    shopping.add('Free range eggs')
    expect(shopping.has('eggs')).toBe(true)
    expect(shopping.has('Egg')).toBe(true)
    expect(shopping.addUnique('eggs')).toBe(null) // not added again
    expect(shopping.getAll().length).toBe(1)
  })

  it('still adds genuinely different items', () => {
    shopping.add('Chicken breast')
    expect(shopping.has('Chicken thigh')).toBe(false)
    expect(shopping.addUnique('Chicken thigh')).not.toBe(null)
    expect(shopping.getAll().length).toBe(2)
  })

  it('is empty-name safe', () => {
    expect(shopping.has('')).toBe(false)
    expect(shopping.has('   ')).toBe(false)
  })
})
