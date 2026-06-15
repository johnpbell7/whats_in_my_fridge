// Dietary preferences: the diets the user follows and the things they must
// avoid (allergies). Stored alongside the other preferences (see staples.js)
// and woven into every meal/chat/dish request so the AI respects them.

export const DIET_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'dairyFree', label: 'Dairy-free' },
  { key: 'glutenFree', label: 'Gluten-free' },
  { key: 'keto', label: 'Keto' },
  { key: 'lowCarb', label: 'Low-carb' }
]

export const AVOID_OPTIONS = [
  { key: 'nuts', label: 'Nuts' },
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'shellfish', label: 'Shellfish' },
  { key: 'fish', label: 'Fish' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'soy', label: 'Soy' },
  { key: 'sesame', label: 'Sesame' }
]

// Build the instruction the server weaves into the prompt. Empty string when
// nothing is set, so it adds zero tokens for users who haven't picked anything.
export function dietInstruction(diet) {
  if (!diet || typeof diet !== 'object') return ''
  const diets = DIET_OPTIONS.filter((d) => diet.diets?.[d.key]).map((d) => d.label)
  const avoid = AVOID_OPTIONS.filter((a) => diet.avoid?.[a.key]).map((a) => a.label)
  const note = String(diet.note || '').trim().slice(0, 200)
  if (!diets.length && !avoid.length && !note) return ''

  let s =
    "The user has dietary requirements. EVERY meal, recipe or ingredient you suggest MUST comply — silently skip anything in their fridge that doesn't fit, and never propose a dish that breaks these:"
  if (diets.length) s += `\n- Diet: ${diets.join(', ')}.`
  if (avoid.length) {
    s += `\n- ALLERGIES — must NEVER appear in any suggestion, not even a garnish, sauce or trace ingredient: ${avoid.join(', ')}.`
  }
  if (note) s += `\n- Also avoid: ${note}.`
  return s
}

// Has the user set anything? Used to show/hide the "set your diet" hint.
export function hasDiet(diet) {
  return dietInstruction(diet).length > 0
}
