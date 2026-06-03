// Categories carry a sensible default shelf life so you rarely type dates by
// hand (one of the plan's friction-killers).
export const CATEGORIES = [
  { key: 'dairy', label: 'Dairy', days: 7 },
  { key: 'produce', label: 'Produce', days: 5 },
  { key: 'meat', label: 'Meat & fish', days: 3 },
  { key: 'leftovers', label: 'Leftovers', days: 3 },
  { key: 'condiments', label: 'Condiments', days: 90 },
  { key: 'drinks', label: 'Drinks', days: 14 },
  { key: 'other', label: 'Other', days: 7 }
]

export const LOCATIONS = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' }
]

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || 'Other'
export const locationLabel = (key) => LOCATIONS.find((l) => l.key === key)?.label || 'Fridge'

// Suggest an expiry date from category + location. The freezer stretches
// everything; the pantry stretches non-produce.
export function suggestExpiry(category, location, from = new Date()) {
  const base = CATEGORIES.find((c) => c.key === category)?.days ?? 7
  let days = base
  if (location === 'freezer') days = Math.max(base, 60)
  else if (location === 'pantry') days = Math.max(base, category === 'produce' ? 10 : 30)
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
