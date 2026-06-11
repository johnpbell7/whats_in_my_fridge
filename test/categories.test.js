import { describe, it, expect } from 'vitest'
import { guessCategory } from '../src/lib/categories.js'
import { suggestLocation } from '../src/lib/location.js'

describe('guessCategory', () => {
  it('classifies common foods', () => {
    expect(guessCategory('Cheddar cheese')).toBe('dairy')
    expect(guessCategory('Chicken breast')).toBe('meat')
    expect(guessCategory('White bread')).toBe('bakery')
    expect(guessCategory('Galaxy chocolate')).toBe('snacks') // not "drinks" via the "cola" substring
  })
  it('classifies household items, and they win over food substrings', () => {
    expect(guessCategory('Head & Shoulders shampoo')).toBe('household') // "ham" is inside "shampoo"
    expect(guessCategory('Andrex toilet roll')).toBe('household') // "roll" is a bakery word
    expect(guessCategory('Paracetamol')).toBe('household')
  })
  it('falls back to other', () => {
    expect(guessCategory('Mystery thing')).toBe('other')
  })
  it('puts tobacco/nicotine products in other, never produce or snacks', () => {
    expect(guessCategory('Nicotine pouches')).toBe('other')
    expect(guessCategory('Marlboro cigarettes')).toBe('other')
    expect(guessCategory('Vape pods')).toBe('other')
    expect(guessCategory('Rolling tobacco')).toBe('other')
  })
  it('cheeses go to dairy, herbs to produce (the parmesan/herbs fix)', () => {
    expect(guessCategory('Fresh parmesan shavings')).toBe('dairy') // not household via "shaving"
    expect(guessCategory('Parmesan')).toBe('dairy')
    expect(guessCategory('Feta')).toBe('dairy')
    expect(guessCategory('Mozzarella')).toBe('dairy')
    expect(guessCategory('Fresh thyme or rosemary')).toBe('produce')
    expect(guessCategory('Tarragon')).toBe('produce')
    expect(guessCategory('Fresh ginger')).toBe('produce')
  })
  it('classifies seasonings, and keeps fresh produce/herbs out of it', () => {
    expect(guessCategory('Sea salt')).toBe('seasoning')
    expect(guessCategory('Black peppercorns')).toBe('seasoning')
    expect(guessCategory('Paprika')).toBe('seasoning')
    expect(guessCategory('Gravy granules')).toBe('seasoning')
    expect(guessCategory('Garlic powder')).toBe('seasoning')
    expect(guessCategory('Red pepper')).toBe('produce') // bell pepper, not the spice
    expect(guessCategory('Fresh basil')).toBe('produce') // not 'dried basil'
    expect(guessCategory('Salted butter')).toBe('dairy') // 'salt' must not steal it
  })
  it('keeps catching real household items and avoids new false positives', () => {
    expect(guessCategory('Shaving foam')).toBe('household')
    expect(guessCategory('Sausages')).toBe('meat') // "sage" must not steal it
    expect(guessCategory('Peanut butter')).not.toBe('produce') // "pea" must not match
  })
})

describe('suggestLocation', () => {
  it('files fresh foods, cupboard staples, freezer and household correctly', () => {
    expect(suggestLocation('Milk', 'dairy')).toBe('fridge')
    expect(suggestLocation('Tinned tomatoes', 'other')).toBe('pantry')
    expect(suggestLocation('Frozen peas', 'produce')).toBe('freezer')
    expect(suggestLocation('Shampoo', 'household')).toBe('pantry')
    expect(suggestLocation('Bananas', 'produce')).toBe('pantry') // pantry produce
    expect(suggestLocation('Paprika', 'seasoning')).toBe('pantry') // seasonings live in the cupboard
  })
})
