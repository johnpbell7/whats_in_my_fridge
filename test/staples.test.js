import { describe, it, expect } from 'vitest'
import { stapleKey, computeStaples, STAPLE_THRESHOLD } from '../src/lib/staples.js'

describe('stapleKey', () => {
  it('folds case, spacing and simple plurals to one key', () => {
    expect(stapleKey('  EGGS ')).toBe(stapleKey('egg'))
    expect(stapleKey('Tomatoes')).toBe(stapleKey('tomato'))
  })
})

describe('computeStaples', () => {
  const onDay = (name, day, status = 'used') => ({ name, status, added_date: `2026-0${day}-01T00:00:00Z` })

  it('auto-detects an item seen on enough separate days, and marks it missing when none active', () => {
    const items = [onDay('Milk', 1), onDay('Milk', 2), onDay('Milk', 3)] // 3 separate days
    const { staples, missing } = computeStaples(items, {})
    const milk = staples.find((s) => s.name === 'Milk')
    expect(milk).toBeTruthy()
    expect(milk.count).toBeGreaterThanOrEqual(STAPLE_THRESHOLD)
    expect(missing.map((m) => m.name)).toContain('Milk')
  })

  it('does not flag something seen too few times unless pinned', () => {
    const items = [onDay('Capers', 1)]
    expect(computeStaples(items, {}).staples.find((s) => s.name === 'Capers')).toBeFalsy()
    const key = stapleKey('Capers')
    const pinned = computeStaples(items, { pinned: { [key]: { name: 'Capers' } } })
    expect(pinned.staples.find((s) => s.name === 'Capers')).toBeTruthy()
  })

  it('does not mark a staple missing while it is still in stock', () => {
    const items = [onDay('Eggs', 1), onDay('Eggs', 2), onDay('Eggs', 3), { name: 'Eggs', status: 'active', added_date: '2026-04-01T00:00:00Z' }]
    const { missing } = computeStaples(items, {})
    expect(missing.map((m) => m.name)).not.toContain('Eggs')
  })
})
