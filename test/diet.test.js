import { describe, it, expect } from 'vitest'
import { dietInstruction, hasDiet } from '../src/lib/diet.js'

describe('dietInstruction', () => {
  it('is empty (zero tokens) when nothing is set', () => {
    expect(dietInstruction({})).toBe('')
    expect(dietInstruction(null)).toBe('')
    expect(dietInstruction(undefined)).toBe('')
    expect(hasDiet({})).toBe(false)
  })

  it('lists the chosen diets', () => {
    const s = dietInstruction({ diets: { vegan: true, glutenFree: true } })
    expect(s).toContain('Vegan')
    expect(s).toContain('Gluten-free')
    expect(hasDiet({ diets: { vegan: true } })).toBe(true)
  })

  it('flags allergies strongly and by name', () => {
    const s = dietInstruction({ avoid: { nuts: true, shellfish: true } })
    expect(s).toContain('ALLERGIES')
    expect(s).toContain('Nuts')
    expect(s).toContain('Shellfish')
  })

  it('includes the free-text note', () => {
    const s = dietInstruction({ note: 'mushrooms' })
    expect(s).toContain('mushrooms')
    expect(hasDiet({ note: 'mushrooms' })).toBe(true)
  })

  it('caps a long note at 200 chars', () => {
    const s = dietInstruction({ note: 'x'.repeat(500) })
    expect(s).not.toContain('x'.repeat(201))
    expect(s).toContain('x'.repeat(200))
  })
})
