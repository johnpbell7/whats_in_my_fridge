import { describe, it, expect } from 'vitest'
import { looksLongLife } from '../src/lib/categories.js'
import { isLongLife, effectiveExpiry, expiryState } from '../src/lib/expiry.js'

const today = new Date()
const daysAgo = (n) => new Date(today.getTime() - n * 86400000).toISOString()

describe('long-life detection (heuristic)', () => {
  it('flags tins, dried goods and pantry staples', () => {
    expect(looksLongLife('Tinned Tomatoes', 'produce')).toBe(true)
    expect(looksLongLife('Baked Beans', 'other')).toBe(true)
    expect(looksLongLife('Dried Pasta', 'other')).toBe(true)
    expect(looksLongLife('Olive Oil', 'condiments')).toBe(true) // long-life category
    expect(looksLongLife('Basmati Rice', 'other')).toBe(true)
  })
  it('does NOT flag fresh food (and no false positives)', () => {
    expect(looksLongLife('Fresh Spinach', 'produce')).toBe(false)
    expect(looksLongLife('Milk', 'dairy')).toBe(false)
    expect(looksLongLife('Chicken Breast', 'meat')).toBe(false)
    expect(looksLongLife('Potato Gratin', 'leftovers')).toBe(false) // 'tin' inside a word
  })
})

describe('isLongLife — AI flag wins over heuristic', () => {
  it('uses the explicit perishable flag when present', () => {
    expect(isLongLife({ name: 'Mystery', perishable: false })).toBe(true)
    expect(isLongLife({ name: 'Tinned Tomatoes', perishable: true })).toBe(false) // AI says fresh
  })
  it('falls back to the heuristic when no flag', () => {
    expect(isLongLife({ name: 'Baked Beans', category: 'other' })).toBe(true)
    expect(isLongLife({ name: 'Milk', category: 'dairy' })).toBe(false)
  })
})

describe('freshness: long-life items never auto-flag', () => {
  it('gives long-life items no auto expiry (so they read "In stock")', () => {
    const beans = { name: 'Baked Beans', category: 'other', added_date: daysAgo(40) }
    expect(effectiveExpiry(beans)).toBe(null)
    expect(expiryState(beans)).toBe('none')
  })
  it('still tracks perishables normally', () => {
    const milk = { name: 'Milk', category: 'dairy', location: 'fridge', added_date: daysAgo(40) }
    expect(effectiveExpiry(milk)).not.toBe(null)
    expect(expiryState(milk)).toBe('expired') // 40 days > 7-day window
  })
  it('honours a real user-set use-by even on a long-life item', () => {
    const jar = { name: 'Open Jam Jar', category: 'condiments', added_date: daysAgo(2), expiry_date: '2020-01-01' }
    expect(effectiveExpiry(jar)).toBe('2020-01-01')
  })
})
