// "What's new" feed shown in the Help sheet. Add a new entry to the TOP whenever
// a feature ships — bump its `id` and the ⓘ button shows an unseen dot until the
// user opens Help. Keep ids unique and incrementing.

export const WHATS_NEW = [
  {
    id: '2026-06-chat',
    date: 'Jun 2026',
    text: 'New chat shortcuts — “Use what’s expiring”, “No extra shopping”, plus breakfast, healthy & light and freezer-friendly meal ideas.'
  },
  {
    id: '2026-06-nudge',
    date: 'Jun 2026',
    text: 'A nudge on the chat screen when food needs using up — tap it for instant meal ideas built around what’s about to go off.'
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
