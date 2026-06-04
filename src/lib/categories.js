// Categories carry a default "fresh window" in days, counted from when the item
// was added (i.e. purchased). Fresh perishables work on a ~7-day scale: after
// about a week they flag as getting old. You can always override with an exact
// date, but you never have to — adding it is enough.
export const CATEGORIES = [
  { key: 'dairy', label: 'Dairy', days: 7 },
  { key: 'produce', label: 'Produce', days: 7 },
  { key: 'meat', label: 'Meat & fish', days: 7 },
  { key: 'bakery', label: 'Bakery', days: 5 },
  { key: 'leftovers', label: 'Leftovers', days: 5 },
  { key: 'condiments', label: 'Condiments', days: 90 },
  { key: 'drinks', label: 'Drinks', days: 14 },
  { key: 'snacks', label: 'Snacks', days: 60 },
  { key: 'household', label: 'Household', days: 365 },
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
// Order matters: the first group with a matching keyword wins. Household is
// checked FIRST because its words are distinctive and several are substrings of
// food names ("shampoo" contains "ham", "toilet roll" contains "roll", "foil"
// contains "oil") — almost no food name contains a household word, so this is
// safe. After that, bakery and snacks are checked before drinks/produce/
// condiments so obvious matches win over coincidental substrings (e.g.
// "chocolate" contains "cola").
const CATEGORY_KEYWORDS = [
  // Non-food household items.
  ['household', ['bleach', 'detergent', 'washing up', 'washing-up', 'washing powder', 'fabric softener',
    'softener', 'disinfectant', 'surface spray', 'cleaner', 'cleaning', 'dishwasher tablet', 'dishwasher',
    'scourer', 'bin bag', 'bin liner', 'kitchen roll', 'toilet roll', 'loo roll', 'toilet',
    'wipes', 'wipe', 'tissue', 'foil', 'cling film', 'clingfilm', 'air freshener', 'candle', 'battery',
    'batteries', 'shampoo', 'conditioner', 'shower gel', 'soap', 'hand wash', 'body wash', 'toothpaste',
    'toothbrush', 'mouthwash', 'floss', 'deodorant', 'antiperspirant', 'razor', 'shaving', 'moisturiser',
    'moisturizer', 'lotion', 'sunscreen', 'sun cream', 'cotton wool', 'cotton pad', 'sanitary', 'tampon',
    'nappy', 'nappies', 'toilet paper', 'paracetamol', 'ibuprofen', 'aspirin', 'painkiller', 'plaster',
    'bandage', 'vitamin', 'supplement', 'medicine', 'tablets', 'capsule', 'antiseptic', 'cough', 'lozenge',
    'cold and flu', 'first aid', 'first-aid', 'antihistamine', 'allergy']],
  ['dairy', ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'margarine', 'custard']],
  ['meat', ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey', 'steak',
    'fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp']],
  ['bakery', ['bread', 'loaf', 'roll', 'bagel', 'baguette', 'croissant', 'pastry', 'muffin', 'bun',
    'pitta', 'pita', 'naan', 'crumpet', 'scone', 'brioche', 'sourdough', 'ciabatta', 'wrap', 'tortilla',
    'doughnut', 'donut']],
  ['snacks', ['crisp', 'chocolate', 'biscuit', 'cookie', 'sweets', 'candy', 'popcorn', 'pretzel',
    'cracker', 'wafer', 'haribo', 'snack', 'chocolate bar', 'crackers', 'nachos', 'tortilla chip']],
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
