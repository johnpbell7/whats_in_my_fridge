// ---------------------------------------------------------------------------
// Staples: "what's usually here, but isn't right now".
//
// Over time the inventory accumulates history — items marked used/discarded
// stay around in the archive. By grouping every record by name we can see how
// often a thing recurs in the fridge. Anything that shows up on enough
// separate occasions is treated as a staple; when a staple has no active stock
// left, it's "missing" and worth restocking.
//
// Detection is automatic (frequency-based) but the user stays in charge: they
// can pin anything as a staple (even something bought once) or dismiss an
// auto-detected one. Those preferences live in their own durable record,
// alongside the inventory and shopping list, using the same storage approach.
// ---------------------------------------------------------------------------

// Seen on this many separate days → treated as a staple automatically.
export const STAPLE_THRESHOLD = 3

// Fold a name down to a comparison key so "Eggs", "egg" and "  EGGS "
// all count as the same staple. Light singularisation only — we keep the
// most recent original spelling for display.
function singular(w) {
  if (w.length <= 3) return w
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.endsWith('oes')) return w.slice(0, -2)
  if (w.endsWith('ses')) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

export function stapleKey(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

// Build the list of staples from the full inventory (active + archived) and
// the user's pin/dismiss preferences. Returns every tracked staple plus the
// subset that's currently missing (nothing active in stock).
export function computeStaples(items = [], prefs = {}) {
  const pinned = prefs.pinned || {}
  const ignored = prefs.ignored || {}
  const groups = new Map()

  for (const it of items) {
    const key = stapleKey(it.name)
    if (!key) continue
    let g = groups.get(key)
    if (!g) {
      g = { key, name: it.name, days: new Set(), activeCount: 0, lastSeen: 0, location: it.location, category: it.category }
      groups.set(key, g)
    }
    const day = (it.added_date || '').slice(0, 10)
    if (day) g.days.add(day)
    if (it.status === 'active') g.activeCount += 1
    const t = Date.parse(it.added_date) || 0
    if (t >= g.lastSeen) {
      g.lastSeen = t
      g.name = it.name
      g.location = it.location
      g.category = it.category
    }
  }

  // Pinned staples the fridge has never actually held still belong on the list.
  for (const key of Object.keys(pinned)) {
    if (!groups.has(key)) {
      const p = pinned[key] || {}
      groups.set(key, {
        key,
        name: p.name || key,
        days: new Set(),
        activeCount: 0,
        lastSeen: 0,
        location: p.location || 'fridge',
        category: p.category || 'other'
      })
    }
  }

  const staples = []
  for (const g of groups.values()) {
    const count = g.days.size
    const isPinned = Boolean(pinned[g.key])
    const auto = count >= STAPLE_THRESHOLD && !ignored[g.key]
    if (!isPinned && !auto) continue
    staples.push({
      key: g.key,
      name: g.name,
      count,
      activeCount: g.activeCount,
      lastSeen: g.lastSeen ? new Date(g.lastSeen).toISOString() : null,
      location: g.location,
      category: g.category,
      pinned: isPinned,
      auto,
      missing: g.activeCount === 0
    })
  }

  // Missing first, then the things we see most often.
  staples.sort(
    (a, b) =>
      Number(b.missing) - Number(a.missing) ||
      b.count - a.count ||
      a.name.localeCompare(b.name)
  )

  return { staples, missing: staples.filter((s) => s.missing) }
}

// --- preferences store (pins + dismissals) ---------------------------------
// Same durable IndexedDB + localStorage-mirror approach as the other stores,
// kept under its own record key so it can't disturb the inventory.

const DB_NAME = 'fridge'
const STORE_NAME = 'kv'
const RECORD_KEY = 'staple-prefs'
const LS_KEY = 'fridge.staples.v1'

const listeners = new Set()
let cache = { pinned: {}, ignored: {} }
let ready = null

function notify() {
  listeners.forEach((fn) => fn())
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_KEY)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, RECORD_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function clean(value) {
  if (!value || typeof value !== 'object') return null
  return { pinned: value.pinned || {}, ignored: value.ignored || {} }
}

function readLocal() {
  try {
    return clean(JSON.parse(localStorage.getItem(LS_KEY)))
  } catch {
    return null
  }
}

export function initStaplePrefs() {
  if (ready) return ready
  ready = (async () => {
    try {
      let data = clean(await idbGet())
      if (!data) {
        const legacy = readLocal()
        if (legacy) {
          data = legacy
          await idbSet(legacy)
        }
      }
      cache = data || { pinned: {}, ignored: {} }
    } catch (err) {
      console.error('Staple prefs IndexedDB unavailable, using localStorage:', err)
      cache = readLocal() || { pinned: {}, ignored: {} }
    }
    notify()
  })()
  return ready
}

function commit(next) {
  cache = next
  notify()
  idbSet(cache).catch((err) => console.error('Could not save staple prefs:', err))
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* primary store is IndexedDB */
  }
}

export const staplePrefs = {
  getAll: () => cache,

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  isPinned: (key) => Boolean(cache.pinned[key]),

  // Force something to be tracked as a staple. Clears any prior dismissal.
  pin(key, meta = {}) {
    if (!key) return
    const ignored = { ...cache.ignored }
    delete ignored[key]
    commit({
      pinned: { ...cache.pinned, [key]: { name: meta.name || key, location: meta.location, category: meta.category } },
      ignored
    })
  },

  unpin(key) {
    if (!cache.pinned[key]) return
    const pinned = { ...cache.pinned }
    delete pinned[key]
    commit({ pinned, ignored: cache.ignored })
  },

  // Dismiss an auto-detected staple ("not a staple"). Also drops any pin.
  ignore(key) {
    if (!key) return
    const pinned = { ...cache.pinned }
    delete pinned[key]
    commit({ pinned, ignored: { ...cache.ignored, [key]: true } })
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY) {
      const next = readLocal()
      if (next) {
        cache = next
        notify()
      }
    }
  })
}
