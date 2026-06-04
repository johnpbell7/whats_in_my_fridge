// Categories carry a default "fresh window" in days, counted from when the item
// was added (i.e. purchased). Fresh perishables work on a ~7-day scale: after
// about a week they flag as getting old. You can always override with an exact
// date, but you never have to — adding it is enough.
export const CATEGORIES = [
  { key: 'dairy', label: 'Dairy', days: 7 },
  { key: 'produce', label: 'Produce', days: 7 },
  { key: 'meat', label: 'Meat & fish', days: 7 },
  { key: 'leftovers', label: 'Leftovers', days: 5 },
  { key: 'condiments', label: 'Condiments', days: 90 },
  { key: 'drinks', label: 'Drinks', days: 14 },
  { key: 'other', label: 'Other', days: 21 }
]

export const LOCATIONS = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' }
]

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || 'Other'
export const locationLabel = (key) => LOCATIONS.find((l) => l.key === key)?.label || 'Fridge'

// Best-guess category from a name alone — used when a shopping-list item (which
// only has a name) is moved into the inventory, so it gets a sensible area and
// use-by without the user having to pick. Falls back to 'other'.
const CATEGORY_KEYWORDS = [
  ['dairy', ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'margarine', 'custard']],
  ['meat', ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey', 'steak',
    'fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp']],
  ['drinks', ['juice', 'soda', 'cola', 'wine', 'beer', 'coffee', 'tea', 'squash', 'lemonade',
    'cordial', 'smoothie', 'fizzy drink', 'sparkling water', 'still water']],
  ['produce', ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'pepper',
    'cucumber', 'spinach', 'broccoli', 'fruit', 'veg', 'salad', 'berry', 'berries', 'grape', 'lemon',
    'lime', 'garlic', 'mushroom', 'avocado', 'courgette', 'cabbage', 'celery', 'kale', 'pear',
    'coriander', 'cilantro', 'basil', 'parsley', 'mint', 'dill', 'chive', 'herb', 'rocket', 'leek',
    'cauliflower', 'aubergine', 'melon', 'strawberr', 'raspberr', 'blueberr', 'spring onion']],
  ['condiments', ['sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'jam', 'honey', 'oil', 'vinegar',
    'dressing', 'spread', 'marmalade', 'chutney', 'pickle']]
]

export function guessCategory(name = '') {
  const n = name.toLowerCase()
  for (const [key, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => n.includes(w))) return key
  }
  return 'other'
}

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
