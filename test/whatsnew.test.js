import { describe, it, expect, beforeEach, vi } from 'vitest'

// minimal localStorage stub for the node test env
beforeEach(() => {
  const store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  })
  vi.resetModules()
})

describe('whats-new seen tracking', () => {
  it('is unseen until marked, then seen', async () => {
    const { hasUnseen, markSeen, LATEST } = await import('../src/lib/whatsnew.js')
    expect(LATEST).toBeTruthy()
    expect(hasUnseen()).toBe(true) // nothing stored yet
    markSeen()
    expect(hasUnseen()).toBe(false)
  })

  it('goes unseen again when a newer entry ships', async () => {
    const mod = await import('../src/lib/whatsnew.js')
    mod.markSeen()
    expect(mod.hasUnseen()).toBe(false)
    // simulate a previously-seen older id; a newer LATEST should re-flag
    localStorage.setItem('fridge.whatsnew.seen', 'older-id-from-before')
    expect(mod.hasUnseen()).toBe(true)
  })
})
