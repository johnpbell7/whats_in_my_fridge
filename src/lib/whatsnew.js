// "What's new" feed shown in the Help sheet. Add a new entry to the TOP whenever
// a feature ships — bump its `id` and the ⓘ button shows an unseen dot until the
// user opens Help. Keep ids unique and incrementing.

export const WHATS_NEW = [
  {
    id: '2026-06-dinner',
    date: 'Jun 2026',
    text: 'Dinner from a photo — snap whatever you’ve got and AI turns it into real meal ideas for tonight, with the few extras to buy. Pick a cuisine, cook for your diet, no typing or setup.'
  },
  {
    id: '2026-06-diet',
    date: 'Jun 2026',
    text: 'Cooks for your diet — set your dietary needs and allergies in Account (vegetarian, gluten-free, no nuts…) and every meal idea and chat answer follows them.'
  },
  {
    id: '2026-06-freshness',
    date: 'Jun 2026',
    text: 'Smarter freshness — tins, jars and dried staples now read “In stock” instead of being flagged as expiring, so you’re only nudged about food that actually goes off.'
  },
  {
    id: '2026-06-dish',
    date: 'Jun 2026',
    text: 'Cook a specific dish — tell the chat what you fancy and it shows what you’ve already got and what you still need, ready to add to your list.'
  },
  {
    id: '2026-06-aisle',
    date: 'Jun 2026',
    text: 'Shop by aisle — your shopping list now groups into categories like the fridge, so you can shop section by section.'
  }
]

// The newest entry's id — what "seen" is compared against.
export const LATEST = WHATS_NEW[0]?.id || ''

const KEY = 'fridge.whatsnew.seen'

export function hasUnseen() {
  if (!LATEST) return false
  try {
    return localStorage.getItem(KEY) !== LATEST
  } catch {
    return false // private mode: don't nag
  }
}

export function markSeen() {
  try {
    localStorage.setItem(KEY, LATEST)
  } catch {
    /* private mode — fine */
  }
}
