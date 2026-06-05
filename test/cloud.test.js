import { describe, it, expect } from 'vitest'
import { mergeItems } from '../src/lib/cloud.js'

const t0 = '2026-01-01T00:00:00Z'
const t1 = '2026-01-02T00:00:00Z'
const t2 = '2026-01-03T00:00:00Z'

describe('mergeItems', () => {
  it('keeps the union of live ids, pushing only local-newer rows', () => {
    const { merged, toPush } = mergeItems(
      [{ id: 'A', updated_at: t2 }, { id: 'B', updated_at: t0 }],
      [{ id: 'B', updated_at: t1 }, { id: 'C', updated_at: t1 }]
    )
    expect(merged.map((m) => m.id).sort()).toEqual(['A', 'B', 'C'])
    expect(toPush.map((m) => m.id)).toEqual(['A']) // B remote is newer, not pushed
  })

  it('removes tombstoned rows and does not resurrect them', () => {
    const { merged, toPush } = mergeItems(
      [{ id: 'X', updated_at: t0 }], // stale local copy
      [{ id: 'X', updated_at: t2, deleted_at: t2 }] // newer tombstone
    )
    expect(merged).toEqual([])
    expect(toPush).toEqual([])
  })

  it('lets a newer local edit win over an older tombstone (intended re-create)', () => {
    const { merged, toPush } = mergeItems(
      [{ id: 'X', updated_at: t2 }],
      [{ id: 'X', updated_at: t1, deleted_at: t1 }]
    )
    expect(merged.map((m) => m.id)).toEqual(['X'])
    expect(toPush.map((m) => m.id)).toEqual(['X'])
  })

  it('preserves the filed flag through a merge', () => {
    const { merged } = mergeItems([{ id: 'N', filed: false, updated_at: t2 }], [])
    expect(merged[0].filed).toBe(false)
  })
})
