import { describe, it, expect } from 'vitest'
import { isEstimated, daysOld, daysUntil, effectiveExpiry, expiryState } from '../src/lib/expiry.js'
import { suggestExpiry } from '../src/lib/categories.js'

const isoAgo = (days) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}
const inDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('isEstimated', () => {
  it('is true with no stored date, false with a real user date', () => {
    expect(isEstimated({ added_date: isoAgo(1), category: 'dairy', location: 'fridge' })).toBe(true)
    expect(isEstimated({ added_date: isoAgo(1), expiry_date: inDays(3), category: 'dairy', location: 'fridge' })).toBe(false)
    expect(isEstimated({})).toBe(false)
  })
  it('treats a stored date equal to the auto-suggestion as still estimated', () => {
    const added = isoAgo(2)
    const est = suggestExpiry('produce', 'fridge', new Date(added))
    expect(isEstimated({ added_date: added, expiry_date: est, category: 'produce', location: 'fridge' })).toBe(true)
  })
})

describe('age + expiry helpers', () => {
  it('daysOld counts whole days since added (clamped at 0)', () => {
    expect(daysOld({ added_date: isoAgo(0) })).toBe(0)
    expect(daysOld({ added_date: isoAgo(3) })).toBe(3)
  })
  it('daysUntil is negative once past', () => {
    expect(daysUntil(inDays(2))).toBe(2)
    expect(daysUntil(inDays(-1))).toBe(-1)
  })
  it('effectiveExpiry uses an exact date, else derives from added + window', () => {
    expect(effectiveExpiry({ expiry_date: '2026-12-25' })).toBe('2026-12-25')
    const derived = effectiveExpiry({ added_date: isoAgo(0), category: 'produce', location: 'fridge' })
    expect(derived).toBe(inDays(7)) // produce window is 7 days
  })
  it('expiryState flags soon/expired', () => {
    expect(expiryState({ expiry_date: inDays(-1), category: 'dairy' })).toBe('expired')
    expect(expiryState({ expiry_date: inDays(1), category: 'dairy' })).toBe('soon')
    expect(expiryState({ expiry_date: inDays(10), category: 'dairy' })).toBe('ok')
  })
})
