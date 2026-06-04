// Saved meals — the dinners/lunches you liked from the AI and chose to keep.
// Each holds the recipe-ish summary plus what it uses from your inventory and a
// few extra things to buy, so a saved meal doubles as a shopping shortcut.
// Local-only (like the chat + shopping list), cleared on account change.

const LS_KEY = 'fridge.meals.v1'
const listeners = new Set()

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

let cache = read()

function notify() {
  listeners.forEach((fn) => fn())
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache))
  } catch {
    /* private mode — won't persist */
  }
}

const norm = (n) => String(n || '').trim().toLowerCase()
const uid = () =>
  globalThis.crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(36).slice(2)}`

let remote = null

export const savedMeals = {
  getAll: () => cache,

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  // Already saved something by this name? (case-insensitive, so it can't pile up)
  has: (name) => cache.some((m) => norm(m.name) === norm(name)),

  add(meal) {
    if (!meal || !meal.name || savedMeals.has(meal.name)) return null
    const now = new Date().toISOString()
    const rec = {
      id: uid(),
      name: String(meal.name).trim(),
      description: String(meal.description || '').trim(),
      uses: Array.isArray(meal.uses) ? meal.uses : [],
      buy: Array.isArray(meal.buy) ? meal.buy : [],
      cooked_count: 0,
      last_cooked: null,
      saved_date: now,
      updated_at: now
    }
    cache = [rec, ...cache]
    persist()
    notify()
    remote?.upsert([rec])
    return rec
  },

  // Record that the user cooked this meal — bumps the count and the date.
  markCooked(id) {
    let updated = null
    cache = cache.map((m) => {
      if (m.id !== id) return m
      updated = {
        ...m,
        cooked_count: (m.cooked_count || 0) + 1,
        last_cooked: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      return updated
    })
    if (!updated) return
    persist()
    notify()
    remote?.upsert([updated])
  },

  remove(id) {
    cache = cache.filter((m) => m.id !== id)
    persist()
    notify()
    remote?.remove(id)
  },

  // Replace the local list from a cloud pull. Local-only.
  replaceAll(records) {
    cache = Array.isArray(records) ? records : []
    persist()
    notify()
  },

  setRemote(r) {
    remote = r
  },

  clear() {
    cache = []
    persist()
    notify()
  }
}
