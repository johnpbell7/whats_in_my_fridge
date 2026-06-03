// ---------------------------------------------------------------------------
// Inventory store.
//
// Storage is IndexedDB (durable, and on an installed PWA it can be marked
// "persistent" so the OS won't evict it — which is what makes the fridge
// actually remembered between sessions). We keep an in-memory cache so reads
// stay synchronous for React, mirror every write to localStorage as a belt-
// and-braces backup, and migrate any pre-existing localStorage data on first
// run. Everything still goes through this one interface, so it can later be
// repointed at a server (e.g. Supabase) without touching any component.
// ---------------------------------------------------------------------------

const DB_NAME = 'fridge'
const STORE_NAME = 'kv'
const RECORD_KEY = 'items'
const LS_KEY = 'fridge.items.v1' // legacy + backup mirror

const listeners = new Set()
let cache = []
let ready = null

function notify() {
  listeners.forEach((fn) => fn())
}

// --- tiny IndexedDB helpers (no dependency) --------------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
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

// Load once. Components render an empty list until this resolves (the splash
// screen covers that brief moment), then re-render with the saved inventory.
export function initStore() {
  if (ready) return ready
  ready = (async () => {
    // Ask the browser to keep our storage around (granted on installed PWAs).
    try {
      await navigator.storage?.persist?.()
    } catch {
      /* not fatal */
    }
    try {
      let data = await idbGet()
      if (!Array.isArray(data)) {
        // First run on IndexedDB — migrate anything saved under localStorage.
        const legacy = readLocal()
        if (legacy && legacy.length) {
          data = legacy
          await idbSet(legacy)
        }
      }
      cache = Array.isArray(data) ? data : []
    } catch (err) {
      console.error('IndexedDB unavailable, using localStorage:', err)
      cache = readLocal() || []
    }
    notify()
  })()
  return ready
}

function commit(next) {
  cache = next
  notify()
  idbSet(cache).catch((err) => console.error('Could not save inventory to IndexedDB:', err))
  // Mirror to localStorage too, so data survives even if one store is cleared.
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* quota/private mode — IndexedDB is the primary store anyway */
  }
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`

function normalize(input) {
  return {
    id: uid(),
    name: '',
    category: 'other',
    quantity: 1,
    unit: '',
    location: 'fridge',
    added_date: new Date().toISOString(),
    expiry_date: null,
    status: 'active',
    source: 'manual',
    confidence: null,
    notes: '',
    ...input
  }
}

export const store = {
  getAll: () => cache,

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  add(input) {
    const record = normalize(input)
    commit([record, ...cache])
    return record
  },

  addMany(inputs) {
    const records = inputs.map(normalize)
    commit([...records, ...cache])
    return records
  },

  update(id, patch) {
    commit(cache.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  },

  remove(id) {
    commit(cache.filter((it) => it.id !== id))
  },

  setStatus(id, status) {
    this.update(id, { status })
  }
}

// Pick up edits made in another tab/window (via the localStorage mirror).
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
