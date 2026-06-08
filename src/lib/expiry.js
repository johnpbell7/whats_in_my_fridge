import { suggestExpiry, looksLongLife } from './categories.js'

const DAY = 86400000

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Long-life staples (tins, jars, dried goods, condiments…) shouldn't get an
// automatic freshness window — a tin of beans isn't "off" after a few weeks.
// Prefer the AI's per-item `perishable` flag from scanning; fall back to a
// name/category heuristic for manual adds and older items.
export function isLongLife(item) {
  if (!item) return false
  if (typeof item.perishable === 'boolean') return !item.perishable
  return looksLongLife(item.name, item.category)
}

// The date an item is judged against. If you set an exact use-by we use it;
// otherwise we work it out from when it was added (purchased) plus the
// category's fresh window — so freshness tracks automatically even when nobody
// types a date. Long-life staples get no auto window: they only have a date if
// you set a real one yourself, so they never nag as "expiring".
export function effectiveExpiry(item) {
  if (!item) return null
  // A real, user-entered use-by always wins.
  if (item.expiry_date && !isEstimated(item)) return item.expiry_date
  if (isLongLife(item)) return null
  if (item.expiry_date) return item.expiry_date
  if (!item.added_date) return null
  return suggestExpiry(item.category, item.location, new Date(item.added_date))
}

// True when the freshness is an automatic estimate rather than an accurate
// use-by the user actually entered. No stored date (we count from the added
// date) is an estimate; so is a stored date that exactly equals what we'd
// auto-suggest — older auto-filed items kept one, and it isn't a real use-by.
export function isEstimated(item) {
  if (!item || !item.added_date) return false
  if (!item.expiry_date) return true
  return item.expiry_date === suggestExpiry(item.category, item.location, new Date(item.added_date))
}

// Whole days since an item was added (0 = added today).
export function daysOld(item, today = new Date()) {
  if (!item?.added_date) return 0
  return Math.max(0, Math.round((startOfDay(today) - startOfDay(new Date(item.added_date))) / DAY))
}

// Whole days from today until the given YYYY-MM-DD (negative = already past).
export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null
  const target = startOfDay(new Date(dateStr + 'T00:00:00'))
  return Math.round((target - startOfDay(today)) / DAY)
}

// 'expired' | 'soon' (<= 2 days) | 'ok' | 'none'
export function expiryState(item, today = new Date()) {
  const d = daysUntil(effectiveExpiry(item), today)
  if (d === null) return 'none'
  if (d < 0) return 'expired'
  if (d <= 2) return 'soon'
  return 'ok'
}

export function expiryLabel(dateStr, today = new Date()) {
  const d = daysUntil(dateStr, today)
  if (d === null) return ''
  if (d < -1) return `${Math.abs(d)} days ago`
  if (d === -1) return 'Yesterday'
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d <= 7) return `${d} days`
  const dt = new Date(dateStr + 'T00:00:00')
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// Sort: expired first, then soonest expiry, then dated items, then undated.
export function sortByExpiry(items, today = new Date()) {
  return [...items].sort((a, b) => {
    const da = daysUntil(effectiveExpiry(a), today)
    const db = daysUntil(effectiveExpiry(b), today)
    if (da === null && db === null) return a.name.localeCompare(b.name)
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })
}
