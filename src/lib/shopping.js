// Shopping list store. Same durable IndexedDB approach as the inventory store,
// kept deliberately separate (its own record key) so it can't disturb the
// verified inventory persistence. Mirrors to localStorage as a backup.

const DB_NAME = 'fridge'
const STORE_NAME = 'kv'
const RECORD_KEY = 'shopping'
const LS_KEY = 'fridge.shopping.v1'

const listeners = new Set()
let cache = []
let ready = null

// A separate, monotonic "an item was added" signal — distinct from list
// changes so the UI can pulse the Shopping tab only on genuine additions (not
// on toggles, removals, or a cloud pull replacing the whole list).
const addListeners = new Set()
let addCount = 0
function notifyAdd() {
  addCount += 1
  addListeners.forEach((fn) => fn())
}

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

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY))
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

export function initShopping() {
  if (ready) return ready
  ready = (async () => {
    try {
      let data = await idbGet()
      if (!Array.isArray(data)) {
        const legacy = readLocal()
        if (legacy && legacy.length) {
          data = legacy
          await idbSet(legacy)
        }
      }
      cache = Array.isArray(data) ? data : []
    } catch (err) {
      console.error('Shopping list IndexedDB unavailable, using localStorage:', err)
      cache = readLocal() || []
    }
    notify()
  })()
  return ready
}

function commit(next) {
  cache = next
  notify()
  idbSet(cache).catch((err) => console.error('Could not save shopping list:', err))
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* primary store is IndexedDB */
  }
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`

let remote = null

export const shopping = {
  getAll: () => cache,

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  add(name, quantity = 1) {
    const clean = String(name).trim()
    if (!clean) return null
    const record = { id: uid(), name: clean, quantity, checked: false, added_date: new Date().toISOString() }
    commit([record, ...cache])
    remote?.upsert([record])
    notifyAdd()
    return record
  },

  // True if something by this name is already on the list (case-insensitive).
  has(name) {
    const clean = String(name).trim().toLowerCase()
    return cache.some((it) => it.name.trim().toLowerCase() === clean)
  },

  // Add only if it isn't already there — used by the staple suggestions so
  // tapping the same one twice can't pile up duplicates.
  addUnique(name, quantity = 1) {
    if (this.has(name)) return null
    return this.add(name, quantity)
  },

  toggle(id) {
    const next = cache.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    commit(next)
    const rec = next.find((it) => it.id === id)
    if (rec) remote?.upsert([rec])
  },

  remove(id) {
    commit(cache.filter((it) => it.id !== id))
    remote?.remove(id)
  },

  clearChecked() {
    const removed = cache.filter((it) => it.checked).map((it) => it.id)
    commit(cache.filter((it) => !it.checked))
    if (removed.length) remote?.removeMany(removed)
  },

  // Wipe the whole list locally (account change). Cloud untouched.
  clear() {
    commit([])
  },

  // Replace the local list from a pull. Local-only.
  replaceAll(records) {
    commit(Array.isArray(records) ? records : [])
  },

  setRemote(r) {
    remote = r
  },

  // Subscribe to "item added" pulses (returns an unsubscribe). getAddCount is
  // the snapshot for useSyncExternalStore.
  subscribeAdds(fn) {
    addListeners.add(fn)
    return () => addListeners.delete(fn)
  },
  getAddCount: () => addCount
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
