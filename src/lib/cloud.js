// ---------------------------------------------------------------------------
// Cloud sync. When signed in, the inventory / shopping list / staple prefs live
// in Supabase (one set of rows per user, protected by row-level security). On
// login we pull them down and merge with whatever's local; from then on every
// change writes through to Supabase. The browser talks to Supabase directly
// (the user's session satisfies RLS) — no server round-trip for data.
//
// Everything is wrapped so that if the tables don't exist yet or the network is
// down, sync silently no-ops and the app keeps working from local storage.
// ---------------------------------------------------------------------------

import { supabase } from './supabase.js'
import { toast } from './toast.js'
import { store, initStore } from './store.js'
import { shopping, initShopping } from './shopping.js'
import { staplePrefs, initStaplePrefs } from './staples.js'
import { chat } from './chat.js'
import { savedMeals } from './meals.js'

const ITEM_COLS = [
  'id', 'name', 'category', 'quantity', 'unit', 'location',
  'added_date', 'expiry_date', 'status', 'source', 'confidence', 'notes', 'filed', 'deleted_at', 'updated_at'
]
const SHOP_COLS = ['id', 'name', 'quantity', 'checked', 'added_date']
const MEAL_COLS = ['id', 'name', 'description', 'uses', 'buy', 'cooked_count', 'last_cooked', 'saved_date', 'updated_at']

let userId = null

const logErr = (label) => (res) => {
  if (res?.error) console.error(`cloud ${label}:`, res.error.message)
}

function pick(obj, cols, extra = {}) {
  const out = { ...extra }
  for (const k of cols) out[k] = obj[k] ?? null
  return out
}

// Last-write-wins merge of two item lists by updated_at (then added_date).
// Rows carrying a `deleted_at` tombstone win like any other (so a delete on one
// device propagates), but are filtered out of the returned `merged` list while
// staying in the cloud — which stops a stale copy on another device from
// "resurrecting" them. Returns the merged list plus the local-side rows to push.
export function mergeItems(local = [], remote = []) {
  const ts = (it) => Date.parse(it?.updated_at || it?.added_date || 0) || 0
  const byId = new Map()
  for (const it of remote) byId.set(it.id, it)
  const toPush = []
  for (const it of local) {
    const ex = byId.get(it.id)
    if (!ex || ts(it) > ts(ex)) {
      byId.set(it.id, it)
      toPush.push(it)
    }
  }
  return { merged: [...byId.values()].filter((it) => !it.deleted_at), toPush }
}

// --- write-through adapters (used by the stores) ---------------------------
const itemsRemote = {
  upsert(records) {
    if (!userId) return
    // Never push demo/sample rows (seeded via ?demo) into a real account.
    const real = records.filter((r) => r.source !== 'sample')
    if (!real.length) return
    supabase.from('items').upsert(real.map((r) => pick(r, ITEM_COLS, { user_id: userId }))).then(logErr('items.upsert'))
  },
  // Soft delete: stamp a tombstone instead of hard-deleting, so the deletion
  // syncs to other devices rather than being undone by their stale copy.
  remove(id) {
    if (!userId) return
    const now = new Date().toISOString()
    supabase.from('items').update({ deleted_at: now, updated_at: now }).eq('id', id).then(logErr('items.remove'))
  }
}

const shoppingRemote = {
  upsert(records) {
    if (!userId) return
    supabase.from('shopping_items').upsert(records.map((r) => pick(r, SHOP_COLS, { user_id: userId }))).then(logErr('shopping.upsert'))
  },
  remove(id) {
    if (!userId) return
    supabase.from('shopping_items').delete().eq('id', id).then(logErr('shopping.remove'))
  },
  removeMany(ids) {
    if (!userId || !ids.length) return
    supabase.from('shopping_items').delete().in('id', ids).then(logErr('shopping.removeMany'))
  }
}

const staplesRemote = {
  save(data) {
    if (!userId) return
    supabase
      .from('staple_prefs')
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() })
      .then(logErr('staples.save'))
  }
}

const mealsRemote = {
  upsert(records) {
    if (!userId) return
    supabase.from('saved_meals').upsert(records.map((r) => pick(r, MEAL_COLS, { user_id: userId }))).then(logErr('meals.upsert'))
  },
  remove(id) {
    if (!userId) return
    supabase.from('saved_meals').delete().eq('id', id).then(logErr('meals.remove'))
  }
}

// Pull this user's rows, merge with local, write back the differences, then
// switch on write-through. Returns true if the pull succeeded.
async function pullAndWire(lastUser) {
  const switched = lastUser && lastUser !== userId
  // Chat isn't cloud-synced, so on an account switch just clear it up front
  // (nothing to recover, and it must not leak to the new account).
  if (switched) chat.clear()
  // On a switch we merge the new account against an EMPTY local base so the
  // previous account's data can't bleed in — but we DON'T wipe local until the
  // pull succeeds, so a failed pull doesn't flash an empty app for no reason.
  const base = (local) => (switched ? null : local)

  let ok = false
  try {
    const [items, shop, prefs] = await Promise.all([
      supabase.from('items').select('*').eq('user_id', userId),
      supabase.from('shopping_items').select('*').eq('user_id', userId),
      supabase.from('staple_prefs').select('data').eq('user_id', userId).maybeSingle()
    ])
    if (items.error || shop.error || prefs.error) {
      throw new Error(items.error?.message || shop.error?.message || prefs.error?.message)
    }

    // Items: last-write-wins merge, push local-newer rows up. Sample/demo rows
    // are excluded so they can't be merged or pushed into the signed-in account.
    const localItems = (base(store.getAll()) || []).filter((it) => it.source !== 'sample')
    const { merged, toPush } = mergeItems(localItems, (items.data || []).map((r) => pick(r, ITEM_COLS)))
    store.replaceAll(merged)
    if (toPush.length) await supabase.from('items').upsert(toPush.map((r) => pick(r, ITEM_COLS, { user_id: userId })))

    // Shopping: union by id (push local-only up).
    const remoteShop = (shop.data || []).map((r) => pick(r, SHOP_COLS))
    const remoteIds = new Set(remoteShop.map((r) => r.id))
    const localShop = base(shopping.getAll()) || []
    const localOnly = localShop.filter((r) => !remoteIds.has(r.id))
    shopping.replaceAll([...localOnly, ...remoteShop])
    if (localOnly.length) await supabase.from('shopping_items').upsert(localOnly.map((r) => pick(r, SHOP_COLS, { user_id: userId })))

    // Staple prefs: merge local + remote (union), save back.
    const remotePrefs = prefs.data?.data || { pinned: {}, ignored: {} }
    const localPrefs = base(staplePrefs.getAll()) || { pinned: {}, ignored: {} }
    const mergedPrefs = {
      pinned: { ...remotePrefs.pinned, ...localPrefs.pinned },
      ignored: { ...remotePrefs.ignored, ...localPrefs.ignored },
      // Dietary prefs are a single object — keep this device's if it's set,
      // otherwise take the cloud's (last-write-wins on a per-device basis).
      diet: localPrefs.diet && Object.keys(localPrefs.diet).length ? localPrefs.diet : remotePrefs.diet || {}
    }
    staplePrefs.replaceData(mergedPrefs)
    await supabase.from('staple_prefs').upsert({ user_id: userId, data: mergedPrefs, updated_at: new Date().toISOString() })

    ok = true
  } catch (err) {
    console.error('cloud pull failed (staying local):', err?.message || err)
    const online = typeof navigator === 'undefined' || navigator.onLine
    // On a FAILED switch, the previous account's data must not remain visible —
    // clear it (it's safe in the cloud and will sync next time). Tell the user
    // so an empty-looking app doesn't read as data loss.
    if (switched) {
      store.clear()
      shopping.clear()
      staplePrefs.clear()
      if (online) toast.show("Couldn't load this account just now — check your connection and reopen.", 3500)
    } else if (online) {
      // Normal login: local data is preserved, so this is non-fatal — just let
      // the user know we're showing the on-device copy rather than the cloud.
      toast.show("Couldn't sync — showing this device's copy.", 2500)
    }
    ok = false
  }

  // Saved meals sync on their own, so if the saved_meals table hasn't been
  // created yet it won't break the rest of sync — meals just stay local until
  // the migration is run.
  try {
    const res = await supabase.from('saved_meals').select('*').eq('user_id', userId)
    if (res.error) throw new Error(res.error.message)
    const localMeals = base(savedMeals.getAll()) || []
    const { merged, toPush } = mergeItems(localMeals, (res.data || []).map((r) => pick(r, MEAL_COLS)))
    savedMeals.replaceAll(merged)
    if (toPush.length) await supabase.from('saved_meals').upsert(toPush.map((r) => pick(r, MEAL_COLS, { user_id: userId })))
    savedMeals.setRemote(mealsRemote)
  } catch (err) {
    console.error('cloud saved_meals sync skipped (staying local):', err?.message || err)
    if (switched) savedMeals.clear()
  }

  return ok
}

// Call on login / account change.
export async function startSync(user) {
  if (!supabase || !user) return
  let lastUser = null
  try {
    lastUser = localStorage.getItem('fridge.lastUser')
  } catch {
    /* private mode */
  }
  userId = user.id

  // Make sure local stores have finished loading before we merge.
  await Promise.all([initStore(), initShopping(), initStaplePrefs()])

  const ok = await pullAndWire(lastUser)

  try {
    localStorage.setItem('fridge.lastUser', userId)
  } catch {
    /* ignore */
  }

  // Only switch on write-through if the pull worked (tables exist / online),
  // so we don't spam errors before Supabase is set up.
  if (ok) {
    store.setRemote(itemsRemote)
    shopping.setRemote(shoppingRemote)
    staplePrefs.setRemote(staplesRemote)
  }
}

// Call on sign-out.
export function stopSync() {
  store.setRemote(null)
  shopping.setRemote(null)
  staplePrefs.setRemote(null)
  savedMeals.setRemote(null)
  store.clear()
  shopping.clear()
  staplePrefs.clear()
  chat.clear()
  savedMeals.clear()
  userId = null
}
