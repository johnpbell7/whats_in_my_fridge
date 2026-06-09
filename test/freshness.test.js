import { describe, it, expect } from 'vitest'
import { expiryState, effectiveExpiry } from '../src/lib/expiry.js'

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()
const banana = (age) => ({ name: 'Bananas', category: 'produce', location: 'pantry', added_date: daysAgo(age) })

describe('fresh produce in the pantry still flags (no pantry stretch)', () => {
  it('is calm for the first few days', () => {
    expect(expiryState(banana(2))).toBe('ok')
    expect(expiryState(banana(4))).toBe('ok')
  })
  it('flags "soon" from ~5 days old', () => {
    expect(expiryState(banana(5))).toBe('soon') // 7-day window, 2 days left
    expect(expiryState(banana(6))).toBe('soon')
  })
  it('is past its window by day 8', () => {
    expect(expiryState(banana(8))).toBe('expired')
  })
  it('a pantry banana now gets a 7-day window (was wrongly stretched to 10)', () => {
    const eff = effectiveExpiry(banana(0))
    const days = Math.round((Date.parse(eff + 'T00:00:00') - Date.parse(daysAgo(0).slice(0, 10) + 'T00:00:00')) / 86400000)
    expect(days).toBe(7)
  })
})

describe('long-life + frozen still never nag', () => {
  it('a tin in the pantry does not flag', () => {
    expect(expiryState({ name: 'Tinned Tomatoes', category: 'produce', location: 'pantry', added_date: daysAgo(40) })).toBe('none')
  })
  it('frozen food keeps a long window', () => {
    expect(expiryState({ name: 'Peas', category: 'produce', location: 'freezer', added_date: daysAgo(20) })).toBe('ok')
  })
})
