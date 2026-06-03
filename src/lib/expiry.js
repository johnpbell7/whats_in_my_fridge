const DAY = 86400000

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Whole days from today until the given YYYY-MM-DD (negative = already past).
export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null
  const target = startOfDay(new Date(dateStr + 'T00:00:00'))
  return Math.round((target - startOfDay(today)) / DAY)
}

// 'expired' | 'soon' (<= 2 days) | 'ok' | 'none'
export function expiryState(item, today = new Date()) {
  const d = daysUntil(item.expiry_date, today)
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
    const da = daysUntil(a.expiry_date, today)
    const db = daysUntil(b.expiry_date, today)
    if (da === null && db === null) return a.name.localeCompare(b.name)
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })
}
