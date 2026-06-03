// ---------------------------------------------------------------------------
// Inventory store.
//
// Source of truth for v1 is the browser (localStorage), so the app is useful
// the moment you open it — no account, no setup. The whole surface is behind
// this small interface so it can be swapped for Supabase later without
// touching any component: reimplement getAll/add/addMany/update/remove against
// the `items` table and keep the subscribe() notification, and the UI is done.
// ---------------------------------------------------------------------------

const KEY = 'fridge.items.v1'
const listeners = new Set()

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

let cache = read()

function commit(next) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch (err) {
    console.error('Could not save inventory:', err)
  }
  listeners.forEach((fn) => fn())
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

// Sync cross-tab edits (and edits from another open instance).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = read()
      listeners.forEach((fn) => fn())
    }
  })
}
