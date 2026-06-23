import { describe, it, expect } from 'vitest'
import { suggestLocation, freezerFromScan } from '../src/lib/location.js'

describe('suggestLocation', () => {
  it('puts fresh produce in the fridge', () => {
    expect(suggestLocation('Lemon', 'produce')).toBe('fridge')
    expect(suggestLocation('Mango', 'produce')).toBe('fridge')
  })
  it('keeps cupboard produce in the pantry', () => {
    expect(suggestLocation('Onions', 'produce')).toBe('pantry')
    expect(suggestLocation('Potatoes', 'produce')).toBe('pantry')
  })
})

describe('freezerFromScan (veto stray frozen flags)', () => {
  it('does NOT freeze clearly-fresh items even if the scanner flags them', () => {
    expect(freezerFromScan('Lemon', true)).toBe(false)
    expect(freezerFromScan('Cucumber', true)).toBe(false)
    expect(freezerFromScan('Fresh basil', true)).toBe(false)
  })
  it('still freezes things genuinely sold frozen', () => {
    expect(freezerFromScan('Frozen peas', true)).toBe(true)
    expect(freezerFromScan('Ice cream', true)).toBe(true)
    expect(freezerFromScan('Mango', true)).toBe(true) // sold frozen, not vetoed
  })
  it('never freezes when the scanner did not flag it', () => {
    expect(freezerFromScan('Lemon', false)).toBe(false)
    expect(freezerFromScan('Chicken breast', false)).toBe(false)
  })
})
