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
    // Whether the item has been organised into its category folder. Defaults to
    // true (already filed); scans/put-away set it false so they show in "New".
    // Kept here so it survives a cloud pull (replaceAll runs through normalize).
    filed: true,
    updated_at: new Date().toISOString(),
    ...input
  }
}

// Optional cloud adapter (set by the sync layer when signed in). Mutations
// write through to it; pulls/clears do not (they're local-only).
let remote = null
const stamp = () => new Date().toISOString()

export const store = {
  getAll: () => cache,

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  add(input) {
    const record = normalize(input)
    commit([record, ...cache])
    remote?.upsert([record])
    return record
  },

  addMany(inputs) {
    const records = inputs.map(normalize)
    commit([...records, ...cache])
    remote?.upsert(records)
    return records
  },

  update(id, patch) {
    const next = cache.map((it) => (it.id === id ? { ...it, ...patch, updated_at: stamp() } : it))
    commit(next)
    const rec = next.find((it) => it.id === id)
    if (rec) remote?.upsert([rec])
  },

  remove(id) {
    commit(cache.filter((it) => it.id !== id))
    remote?.remove(id)
  },

  setStatus(id, status) {
    this.update(id, { status })
  },

  // "Used one of these." A multi-quantity item (e.g. 2 bottles of wine) just
  // loses a single unit and stays in the list; only the LAST one archives to
  // the Used tab. A single item archives straight away, as before.
  useOne(id) {
    const it = cache.find((x) => x.id === id)
    if (!it) return
    const qty = Number(it.quantity) || 1
    if (qty > 1) this.update(id, { quantity: qty - 1 })
    else this.setStatus(id, 'used')
  },

  // Wipe all items locally (account change). Does NOT touch the cloud.
  clear() {
    commit([])
  },

  // Replace the local cache from a pull. Local-only — no write-back.
  replaceAll(records) {
    commit(records.map(normalize))
  },

  // Attach (or clear with null) the cloud write-through adapter.
  setRemote(r) {
    remote = r
  }
}

// --- dev-only sample data -------------------------------------------------
// Populate the fridge with a handful of items — including some history — so the
// staples / "running low" suggestions have something to work with without
// waiting days of real use. Items are tagged source:'sample' so they can be
// cleared again, and re-seeding wipes any previous sample first. The UI only
// exposes this in dev builds.
export function seedSample() {
  const ago = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }
  const inDays = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  const S = (over) => normalize({ source: 'sample', confidence: null, ...over })

  const samples = [
    // Missing staples — seen on 3+ separate days, all now gone.
    S({ name: 'Milk', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(28) }),
    S({ name: 'Milk', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(18) }),
    S({ name: 'Milk', category: 'dairy', location: 'fridge', status: 'discarded', added_date: ago(6) }),
    S({ name: 'Butter', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(40) }),
    S({ name: 'Butter', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(25) }),
    S({ name: 'Butter', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(9) }),
    S({ name: 'Bread', category: 'other', location: 'pantry', status: 'used', added_date: ago(21) }),
    S({ name: 'Bread', category: 'other', location: 'pantry', status: 'used', added_date: ago(12) }),
    S({ name: 'Bread', category: 'other', location: 'pantry', status: 'used', added_date: ago(4) }),

    // A staple that's still in stock — proves it won't nag while you have it.
    S({ name: 'Eggs', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(30) }),
    S({ name: 'Eggs', category: 'dairy', location: 'fridge', status: 'used', added_date: ago(15) }),
    S({ name: 'Eggs', category: 'dairy', location: 'fridge', status: 'active', added_date: ago(2), expiry_date: inDays(12) }),

    // A few ordinary items in stock, including one expiring soon.
    S({ name: 'Cheddar', category: 'dairy', location: 'fridge', status: 'active', added_date: ago(3), expiry_date: inDays(9) }),
    S({ name: 'Spinach', category: 'produce', location: 'fridge', status: 'active', added_date: ago(4), expiry_date: inDays(1) }),
    S({ name: 'Chicken breast', category: 'meat', location: 'fridge', status: 'active', added_date: ago(1), expiry_date: inDays(2) })
  ]

  commit([...samples, ...cache.filter((i) => i.source !== 'sample')])
}

export function clearSample() {
  commit(cache.filter((i) => i.source !== 'sample'))
}

export const hasSample = () => cache.some((i) => i.source === 'sample')

// Pick up edits made in another tab/window (via the localStorage mirror).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    // e.key is null when another tab calls localStorage.clear() (e.g. sign-out);
    // treat that, and a removed key, as an empty list so the clear propagates
    // here instead of leaving stale items on this tab.
    if (e.key !== null && e.key !== LS_KEY) return
    cache = readLocal() || []
    notify()
  })
}
