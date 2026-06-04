// Work out where an item most likely belongs: fridge, freezer, or pantry.
// Priority: freezer signals win first; then strong pantry signals (tinned/
// jarred/sauces) that beat fresh-sounding words; then fridge keywords (fresh
// foods); then the broad pantry list; then a category fallback that trusts a
// fresh category to mean the fridge. Used to pre-fill the location when adding
// by hand, filing scanned items, and restocking from the shopping list.

const FREEZER = [
  'frozen', 'ice cream', 'ice-cream', 'ice lolly', 'lolly', 'ice cube', 'fish finger',
  'fishfinger', 'oven chips', 'frozen peas', 'frozen veg', 'freezer', 'ice pop', 'icepop',
  'gelato', 'sorbet', 'waffle', 'frozen pizza', 'frozen berries', 'frozen fruit', 'frozen fish',
  'frozen chicken', 'chicken nugget', 'nugget', 'potato waffle', 'hash brown', 'yorkshire pudding',
  'frozen yorkshire', 'frozen meal', 'ready meal frozen', 'choc ice', 'magnum', 'cornetto', 'viennetta'
]

// Strong pantry signals — these win even over fresh-sounding words, so
// "tinned tomatoes" and "tomato ketchup" file to the pantry, not the fridge.
const STRONG_PANTRY = [
  'tin', 'tinned', 'canned', 'can ', 'jar', 'dried', 'packet', 'long life', 'long-life',
  'uht', 'ketchup', 'sauce', 'paste', 'powder', 'peppercorn', 'stock cube', 'seasoning'
]

// Fresh things that live in the fridge — checked before the broad pantry list
// so e.g. "chocolate milk" is filed by "milk", not "chocolate".
const FRIDGE = [
  'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'margarine', 'custard',
  'chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey', 'steak',
  'fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp',
  'lettuce', 'salad', 'spinach', 'rocket', 'kale', 'cabbage', 'coriander', 'cilantro', 'basil',
  'parsley', 'mint', 'dill', 'chive', 'herb', 'cucumber', 'tomato', 'pepper', 'courgette',
  'broccoli', 'cauliflower', 'aubergine', 'mushroom', 'celery', 'leek', 'spring onion',
  'grape', 'berry', 'berries', 'strawberr', 'raspberr', 'blueberr', 'melon', 'avocado',
  'hummus', 'houmous', 'dip', 'juice', 'smoothie', 'fresh '
]

// Produce that's stored in the cupboard, not the fridge.
const PANTRY_PRODUCE = ['potato', 'onion', 'garlic', 'banana', 'shallot']
// Drinks that live in the cupboard.
const DRINK_PANTRY = [
  'coffee', 'tea', 'wine', 'spirit', 'whisky', 'vodka', 'gin', 'squash', 'cordial',
  'water bottle', 'still water', 'sparkling water'
]

const PANTRY = [
  'rice', 'pasta', 'spaghetti', 'noodle', 'flour', 'sugar', 'salt', 'cereal', 'oats',
  'porridge', 'bean', 'lentil', 'chickpea', 'crisp', 'biscuit', 'cracker', 'cookie',
  'chocolate', 'sweets', 'candy', 'oil', 'vinegar', 'spice', 'herb jar',
  'honey', 'jam', 'peanut butter', 'nutella', 'bread', 'wrap', 'tortilla', 'baked bean',
  'soup', 'mustard', 'mayonnaise', 'mayo', 'nut', 'raisin', 'popcorn', 'pretzel'
]

export function suggestLocation(name = '', category = 'other') {
  const n = name.toLowerCase()

  if (FREEZER.some((k) => n.includes(k))) return 'freezer'
  // Household items live in the cupboard — decided up front so a stray fresh
  // word in the name (e.g. "cream" in "sun cream") can't pull them to the fridge.
  if (category === 'household') return 'pantry'
  // Strong cupboard signals beat everything else (tinned/jarred/sauces, and
  // produce/drinks that live in the cupboard).
  if (STRONG_PANTRY.some((k) => n.includes(k))) return 'pantry'
  if (PANTRY_PRODUCE.some((k) => n.includes(k))) return 'pantry'
  if (DRINK_PANTRY.some((k) => n.includes(k))) return 'pantry'
  // Fresh foods by name.
  if (FRIDGE.some((k) => n.includes(k))) return 'fridge'
  // Trust a fresh category over loose pantry words (e.g. a "chocolate" protein
  // drink is still a drink -> fridge).
  if (category === 'dairy' || category === 'meat' || category === 'leftovers' || category === 'drinks') {
    return 'fridge'
  }
  if (category === 'produce') return 'fridge'
  // Broad pantry word list, then category default.
  if (PANTRY.some((k) => n.includes(k))) return 'pantry'
  if (category === 'condiments' || category === 'bakery' || category === 'snacks') return 'pantry'
  return 'pantry' // "other" tends to be ambient (tins, packets, household staples)
}
