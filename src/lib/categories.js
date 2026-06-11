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
  { key: 'seasoning', label: 'Seasoning', days: 365 },
  { key: 'drinks', label: 'Drinks', days: 14 },
  { key: 'snacks', label: 'Snacks', days: 60 },
  { key: 'household', label: 'Household', days: 365 },
  { key: 'other', label: 'Other', days: 21 }
]

// Non-food categories never belong in freshness/"what's expiring" — bleach,
// dish soap, cleaning products and toiletries don't go off like food, so they
// must never nag as expiring even if a date gets attached to them.
export const NON_FOOD_CATEGORIES = new Set(['household'])
export const isNonFoodCategory = (category) => NON_FOOD_CATEGORIES.has(category)

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
  // Non-food, non-household products (tobacco/nicotine). Checked first so a
  // brand name never collides with a food keyword and lands in produce/snacks.
  ['other', ['tobacco', 'cigarette', 'cigar', 'rolling tobacco', 'rollie', 'nicotine',
    'nicotine pouch', 'snus', 'vape', 'e-cigarette', 'e cigarette', 'vape pod', 'vape juice']],
  // Non-food household items.
  ['household', ['bleach', 'detergent', 'washing up', 'washing-up', 'washing powder', 'fabric softener',
    'softener', 'disinfectant', 'surface spray', 'cleaner', 'cleaning', 'dishwasher tablet', 'dishwasher',
    'scourer', 'bin bag', 'bin liner', 'kitchen roll', 'toilet roll', 'loo roll', 'toilet',
    'wipes', 'wipe', 'tissue', 'foil', 'cling film', 'clingfilm', 'air freshener', 'candle', 'battery',
    'batteries', 'shampoo', 'conditioner', 'shower gel', 'soap', 'hand wash', 'body wash', 'toothpaste',
    'toothbrush', 'mouthwash', 'floss', 'deodorant', 'antiperspirant', 'razor', 'shaving foam', 'shaving gel', 'shaving cream', 'moisturiser',
    'moisturizer', 'lotion', 'sunscreen', 'sun cream', 'cotton wool', 'cotton pad', 'sanitary', 'tampon',
    'nappy', 'nappies', 'toilet paper', 'paracetamol', 'ibuprofen', 'aspirin', 'painkiller', 'plaster',
    'bandage', 'vitamin', 'supplement', 'medicine', 'tablets', 'capsule', 'antiseptic', 'cough', 'lozenge',
    'cold and flu', 'first aid', 'first-aid', 'antihistamine', 'allergy']],
  ['dairy', ['milk', 'cheese', 'parmesan', 'parmigiano', 'cheddar', 'mozzarella', 'feta', 'brie', 'gouda',
    'halloumi', 'mascarpone', 'ricotta', 'paneer', 'gruyere', 'gruyère', 'stilton', 'camembert', 'wensleydale',
    'yogurt', 'yoghurt', 'butter', 'cream', 'creme fraiche', 'crème fraîche', 'egg', 'margarine', 'custard']],
  ['meat', ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey', 'steak',
    'fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp']],
  ['bakery', ['bread', 'loaf', 'roll', 'bagel', 'baguette', 'croissant', 'pastry', 'muffin', 'bun',
    'pitta', 'pita', 'naan', 'crumpet', 'scone', 'brioche', 'sourdough', 'ciabatta', 'wrap', 'tortilla',
    'doughnut', 'donut']],
  ['snacks', ['crisp', 'chocolate', 'biscuit', 'cookie', 'sweets', 'candy', 'popcorn', 'pretzel',
    'cracker', 'wafer', 'haribo', 'snack', 'chocolate bar', 'crackers', 'nachos', 'tortilla chip']],
  ['drinks', ['juice', 'soda', 'cola', 'wine', 'beer', 'coffee', 'tea', 'squash', 'lemonade',
    'cordial', 'smoothie', 'fizzy drink', 'sparkling water', 'still water']],
  // Salt, pepper, dried/ground herbs & spices, stock cubes and seasoning blends.
  // Checked BEFORE produce (so 'black peppercorns' beats produce's 'pepper'), but
  // uses only distinctly-seasoning words (e.g. 'peppercorn' not bare 'pepper',
  // 'ground ginger' not 'ginger', 'dried basil' not 'basil') so fresh
  // produce/herbs stay in produce. After meat/dairy so 'salted butter' -> dairy.
  ['seasoning', ['salt', 'peppercorn', 'black pepper', 'white pepper', 'ground pepper',
    'paprika', 'cumin', 'turmeric', 'cinnamon', 'nutmeg', 'cayenne', 'chilli powder', 'chili powder',
    'chilli flake', 'chili flake', 'curry powder', 'garam masala', 'mixed spice', 'mixed herbs', 'dried herb',
    'dried oregano', 'dried basil', 'dried thyme', 'italian seasoning', 'spice', 'spices', 'seasoning',
    'stock cube', 'stock pot', 'bouillon', 'gravy granule', 'gravy', 'oxo', 'baking powder', 'baking soda',
    'bicarbonate of soda', 'bicarb', 'cardamom', 'star anise', 'allspice', 'saffron', 'vanilla extract',
    'vanilla essence', 'vanilla pod', 'ground ginger', 'ginger powder', 'garlic powder', 'garlic granule',
    'onion powder', 'taco seasoning', 'fajita seasoning']],
  ['produce', ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'pepper',
    'cucumber', 'spinach', 'broccoli', 'fruit', 'veg', 'salad', 'berry', 'berries', 'grape', 'lemon',
    'lime', 'garlic', 'mushroom', 'avocado', 'courgette', 'cabbage', 'celery', 'kale', 'pear',
    'coriander', 'cilantro', 'basil', 'parsley', 'mint', 'dill', 'chive', 'herb', 'rocket', 'leek',
    'cauliflower', 'aubergine', 'melon', 'strawberr', 'raspberr', 'blueberr', 'spring onion',
    // herbs & more veg
    'thyme', 'rosemary', 'tarragon', 'oregano', 'sage', 'bay leaf', 'bay leaves', 'ginger', 'chilli', 'chili',
    'shallot', 'fennel', 'sweetcorn', 'sweet corn', 'asparagus', 'green bean', 'runner bean', 'peas',
    'beetroot', 'radish', 'squash', 'pumpkin', 'parsnip', 'swede', 'turnip', 'sprout']],
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

// Best-effort "does this keep for ages?" check, used when the AI hasn't tagged
// an item's perishability (manual adds, older items). Catches tins/jars/dried
// goods by name, common ambient staples, and the inherently long-life
// categories — so freshness flagging doesn't nag about baked beans or pasta.
const LONG_LIFE_CATEGORIES = new Set(['condiments', 'seasoning', 'snacks', 'household'])
const LONG_LIFE_WORD = /\b(tinned?|canned?|jarred?|dried|dehydrated|uht|long[- ]?life|powder(ed)?|bouillon|preserved)\b|\b(long life|stock cube|tin of|jar of|can of)\b/i
const LONG_LIFE_STAPLE = /\b(pasta|spaghetti|penne|macaroni|rice|noodles?|flour|sugar|oats|cereal|lentils?|chickpeas?|baked beans|kidney beans|cannellini|passata|tuna|sardines?|honey|jam|marmalade|peanut butter|coffee|tea\b|crackers?|cous ?cous|quinoa)\b/i

export function looksLongLife(name = '', category = '') {
  if (LONG_LIFE_CATEGORIES.has(category)) return true
  const n = String(name).toLowerCase()
  return LONG_LIFE_WORD.test(n) || LONG_LIFE_STAPLE.test(n)
}

// Suggest an expiry date from category + location. The freezer genuinely
// extends shelf life; the pantry does NOT make fresh food last longer (bananas
// in a fruit bowl go off as fast as in the fridge), and long-life staples are
// kept out of freshness tracking separately by the perishable flag.
export function suggestExpiry(category, location, from = new Date()) {
  const base = CATEGORIES.find((c) => c.key === category)?.days ?? 7
  let days = base
  if (location === 'freezer') days = Math.max(base, 60)
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
