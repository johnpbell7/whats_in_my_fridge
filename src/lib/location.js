// Work out where an item most likely belongs: fridge, freezer, or pantry.
// Name keywords win over the category default (a "frozen pizza" beats its
// category). Used to pre-fill the location when adding by hand and to file
// each scanned item automatically.

const FREEZER = [
  'frozen', 'ice cream', 'ice-cream', 'ice lolly', 'lolly', 'ice cube', 'fish finger',
  'fishfinger', 'oven chips', 'frozen peas', 'frozen veg', 'freezer'
]

const PANTRY = [
  'rice', 'pasta', 'spaghetti', 'noodle', 'flour', 'sugar', 'salt', 'cereal', 'oats',
  'porridge', 'tin', 'tinned', 'can ', 'canned', 'bean', 'lentil', 'chickpea', 'crisp',
  'biscuit', 'cracker', 'cookie', 'chocolate', 'sweets', 'candy', 'oil', 'vinegar',
  'spice', 'herb jar', 'stock cube', 'coffee', 'tea', 'honey', 'jam', 'peanut butter',
  'nutella', 'bread', 'wrap', 'tortilla', 'baked bean', 'soup', 'sauce jar', 'pasta sauce',
  'ketchup', 'mustard', 'mayonnaise', 'mayo', 'nut', 'raisin', 'dried', 'potato', 'onion',
  'garlic', 'squash sl', 'cracker', 'popcorn', 'pretzel', 'wine', 'spirit', 'water bottle',
  'still water', 'sparkling water'
]

// Categories that, with no stronger signal, default to the pantry.
const PANTRY_CATEGORIES = new Set(['condiments'])

export function suggestLocation(name = '', category = 'other') {
  const n = name.toLowerCase()

  if (FREEZER.some((k) => n.includes(k))) return 'freezer'
  if (PANTRY.some((k) => n.includes(k))) return 'pantry'

  // Category fallbacks.
  if (category === 'dairy' || category === 'meat' || category === 'leftovers' || category === 'drinks') {
    return 'fridge'
  }
  if (category === 'produce') return 'fridge' // most fresh produce; onions/potatoes caught above
  if (PANTRY_CATEGORIES.has(category)) return 'pantry'
  return 'pantry' // "other" tends to be ambient (tins, packets, household staples)
}
