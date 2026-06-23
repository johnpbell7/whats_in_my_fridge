// Saved meals — the dinners/lunches you liked from the AI and chose to keep.
// Each holds the recipe-ish summary plus what it uses from your inventory and a
// few extra things to buy, so a saved meal doubles as a shopping shortcut.
// Local-only (like the chat + shopping list), cleared on account change.

const LS_KEY = 'fridge.meals.v1'
// Walkthroughs ("how to" recipes) are cached by dish name too — separate from
// the saved-meals list — so a method you've already been given is reused even
// if the meal wasn't saved, was saved before the how-to, or lives on a chat
// card with no id. This is what stops a second credit being spent on a recipe
// you've seen before.
const METHODS_KEY = 'fridge.methods.v1'
const listeners = new Set()

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function readMethods() {
  try {
    const v = JSON.parse(localStorage.getItem(METHODS_KEY))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

let cache = read()
let methodCache = readMethods()

function persistMethods() {
  try {
    localStorage.setItem(METHODS_KEY, JSON.stringify(methodCache))
  } catch {
    /* private mode — won't persist */
  }
}

const validMethod = (m) => !!(m && Array.isArray(m.steps) && m.steps.length)

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
      // The how-to walkthrough is a Plus feature: only persisted when one was
      // generated (i.e. by a Plus/trial user). Free saves carry just the idea.
      method: validMethod(meal.method) ? meal.method : null,
      cooked_count: 0,
      last_cooked: null,
      saved_date: now,
      updated_at: now
    }
    cache = [rec, ...cache]
    persist()
    notify()
    remote?.upsert([rec])
    if (rec.method) savedMeals.rememberMethod(rec.name, rec.method)
    return rec
  },

  // Cache a generated walkthrough by dish name (in addition to any saved meal),
  // so re-opening the how-to for the same dish reuses it instead of spending
  // another credit. Scaled to the servings it was made for — changing the
  // servings still regenerates.
  rememberMethod(name, method) {
    const k = norm(name)
    if (!k || !validMethod(method)) return
    methodCache[k] = method
    const keys = Object.keys(methodCache)
    if (keys.length > 80) delete methodCache[keys[0]] // keep it bounded
    persistMethods()
  },

  // Best walkthrough we already hold for a dish: the saved meal's own method
  // first, else the by-name cache. null if we've never generated one.
  methodFor(name) {
    const k = norm(name)
    if (!k) return null
    const own = cache.find((m) => norm(m.name) === k && validMethod(m.method))
    if (own) return own.method
    return validMethod(methodCache[k]) ? methodCache[k] : null
  },

  // Attach (or replace) the how-to walkthrough on an already-saved meal — used
  // when a Plus user opens the walkthrough on a meal they'd saved earlier.
  setMethod(id, method) {
    let updated = null
    cache = cache.map((m) => {
      if (m.id !== id) return m
      updated = { ...m, method: method || null, updated_at: new Date().toISOString() }
      return updated
    })
    if (!updated) return
    persist()
    notify()
    remote?.upsert([updated])
    if (validMethod(method)) savedMeals.rememberMethod(updated.name, method)
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
    methodCache = {}
    persist()
    persistMethods()
    notify()
  }
}
