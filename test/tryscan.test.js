import { describe, it, expect, beforeEach } from 'vitest'
import { tryScanLimited, TRY_LIMITS } from '../server/core.js'
import { savePending, takePending, pendingCount } from '../src/lib/tryFirst.js'

describe('try it first: limits', () => {
  it('allows each visitor a set number of tries a day, then says used', () => {
    const t = Date.UTC(2026, 10, 12, 9)
    for (let i = 0; i < TRY_LIMITS.perVisitor; i++) expect(tryScanLimited('1.1.1.1', t + i)).toBeNull()
    expect(tryScanLimited('1.1.1.1', t + 10)).toBe('used')
    expect(tryScanLimited('2.2.2.2', t + 11)).toBeNull() // someone else still can
  })

  it('lets the same visitor try again the next day', () => {
    const t = Date.UTC(2026, 10, 13, 9)
    for (let i = 0; i < TRY_LIMITS.perVisitor; i++) tryScanLimited('3.3.3.3', t + i)
    expect(tryScanLimited('3.3.3.3', t + 100)).toBe('used')
    expect(tryScanLimited('3.3.3.3', t + 25 * 60 * 60 * 1000)).toBeNull()
  })
})

describe('try it first: the saved list', () => {
  beforeEach(() => {
    const mem = new Map()
    globalThis.localStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k)
    }
  })

  it('hands the list over once', () => {
    savePending([{ name: 'Milk', category: 'dairy' }, { name: '  ' }])
    expect(pendingCount()).toBe(2)
    expect(takePending().map((i) => i.name)).toEqual(['Milk'])
    expect(takePending()).toEqual([])
  })

  it('drops a list older than a week', () => {
    savePending([{ name: 'Milk' }])
    expect(takePending(Date.now() + 8 * 24 * 60 * 60 * 1000)).toEqual([])
  })
})
