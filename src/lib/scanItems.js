import { suggestLocation, freezerFromScan } from './location.js'

// Turn items read from a photo into fridge items, ready for store.addMany.
// Used by the Scan screen and by the "try it first" photo taken before sign-up.
// location: 'auto' files each item smartly, or a fixed 'fridge' | 'freezer' | 'pantry'.
// added: ISO date the freshness clock starts from.
export function toStoreItems(found, { location = 'auto', added = new Date().toISOString() } = {}) {
  return found.map((d) => {
    // Auto filing: a frozen product goes straight to the freezer; else
    // trust the AI's fridge/freezer/pantry call; else fall back to the
    // name/category guess.
    const loc =
      location === 'auto'
        ? freezerFromScan(d.name, d.frozen)
          ? 'freezer'
          : d.location || suggestLocation(d.name, d.category)
        : location
    return {
      name: d.name.trim(),
      category: d.category,
      quantity: d.quantity || 1,
      unit: d.unit || '',
      location: loc,
      added_date: added,
      // No use-by stored — freshness is counted from the added date and
      // the category's window, so the card shows the item's age, not a
      // "use by". (A user can still set an exact date later by hand.)
      source: 'photo',
      confidence: d.confidence,
      // The AI's read on whether this keeps for ages (tins/dried) or goes
      // off (fresh) — drives freshness flagging. Omitted falls back to a
      // name/category heuristic.
      ...(typeof d.perishable === 'boolean' ? { perishable: d.perishable } : {}),
      filed: false
    }
  })
}
