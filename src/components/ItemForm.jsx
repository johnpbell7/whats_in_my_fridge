import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CATEGORIES, LOCATIONS, suggestExpiry, looksLongLife } from '../lib/categories.js'
import { isLongLife } from '../lib/expiry.js'
import { suggestLocation } from '../lib/location.js'
import { staplePrefs, stapleKey } from '../lib/staples.js'
import { useSheet } from '../lib/useSheet.js'
import { IconClose, IconTrash, IconPin, IconClock } from '../icons.jsx'

export default function ItemForm({ item, onSave, onDelete, onClose }) {
  const isEdit = Boolean(item)
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || 'produce')
  const [quantity, setQuantity] = useState(item?.quantity ?? 1)
  const [unit, setUnit] = useState(item?.unit || '')
  const [location, setLocation] = useState(item?.location || suggestLocation('', item?.category || 'produce'))
  const [locTouched, setLocTouched] = useState(false)
  const [expiry, setExpiry] = useState(item?.expiry_date || '')
  const [notes, setNotes] = useState(item?.notes || '')
  const [touched, setTouched] = useState(false)
  // "Always keep this stocked" — pins it as a staple regardless of frequency,
  // so it's flagged whenever you run out.
  const [pinned, setPinned] = useState(() => staplePrefs.isPinned(stapleKey(item?.name || '')))
  // Long-life staples (tins, dried, condiments) aren't tracked for freshness.
  // Default from the item / a name guess; the user can override.
  const [longLife, setLongLife] = useState(() => isLongLife(item))
  const [llTouched, setLlTouched] = useState(false)
  const sheetRef = useSheet(onClose)

  // While adding a new item, keep filing it to the smart location as the name
  // and category change — until the user picks a location themselves.
  useEffect(() => {
    if (!isEdit && !locTouched) setLocation(suggestLocation(name, category))
  }, [name, category, isEdit, locTouched])

  // Likewise guess long-life from the name/category until the user toggles it.
  useEffect(() => {
    if (!isEdit && !llTouched) setLongLife(looksLongLife(name, category))
  }, [name, category, isEdit, llTouched])

  const suggestion = suggestExpiry(category, location)
  const nameError = touched && !name.trim()

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setTouched(true)
      return
    }
    const cleanName = name.trim()
    const key = stapleKey(cleanName)
    if (pinned) staplePrefs.pin(key, { name: cleanName, location, category })
    else staplePrefs.unpin(key)
    onSave(
      {
        name: cleanName,
        category,
        // Keep a typed 0 ("none left") instead of silently coercing it to 1;
        // only fall back to 1 for blank/invalid input.
        quantity: ((n) => (Number.isFinite(n) && n >= 0 ? n : 1))(Number(quantity)),
        unit: unit.trim(),
        location,
        expiry_date: expiry || null,
        perishable: !longLife,
        notes: notes.trim()
      },
      item?.id
    )
  }

  return (
    <div className="scrim" onClick={onClose}>
      <motion.form
        className="sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-form-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2 id="item-form-title">{isEdit ? 'Edit item' : 'Add an item'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input
            id="f-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Whole milk"
            autoFocus={!isEdit}
            autoComplete="off"
            aria-invalid={nameError}
            style={nameError ? { borderColor: 'var(--danger)' } : undefined}
          />
          {nameError && (
            <p className="expiry-suggest" style={{ color: 'var(--danger)' }}>
              Give it a name so you can find it later.
            </p>
          )}
        </div>

        <div className="field">
          <label>Category</label>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className="chip"
                aria-pressed={category === c.key}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="f-qty">Quantity</label>
            <input
              id="f-qty"
              className="input"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label htmlFor="f-unit">Unit</label>
            <input
              id="f-unit"
              className="input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="carton, block, bunch…"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="field">
          <label>Where</label>
          <div className="chips">
            {LOCATIONS.map((l) => (
              <button
                key={l.key}
                type="button"
                className="chip"
                aria-pressed={location === l.key}
                onClick={() => {
                  setLocation(l.key)
                  setLocTouched(true)
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-expiry">
            Use by <span className="label-opt">— optional</span>
          </label>
          <input
            id="f-expiry"
            className="input"
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
          <p className="expiry-suggest">
            {expiry ? (
              <>
                Using your exact date.{' '}
                <button type="button" onClick={() => setExpiry('')}>
                  Clear &amp; auto-track
                </button>
              </>
            ) : longLife ? (
              <>Long-life item — we won’t flag this for freshness. Set a date above if you want a reminder.</>
            ) : (
              <>
                No need to set one — we’ll count freshness from today, fresh until about{' '}
                <strong>{prettyDate(suggestion)}</strong>.
              </>
            )}
          </p>
        </div>

        <div className="field">
          <label htmlFor="f-notes">Notes</label>
          <textarea
            id="f-notes"
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <button
          type="button"
          className="staple-toggle"
          aria-pressed={pinned}
          onClick={() => setPinned((v) => !v)}
        >
          <span className="staple-toggle-icon">
            <IconPin size={17} />
          </span>
          <span className="staple-toggle-text">
            <strong>Add to your essentials</strong>
            <small>{pinned ? "We'll flag it whenever you run out." : 'Flag it whenever you run out.'}</small>
          </span>
          <span className={`switch ${pinned ? 'on' : ''}`} aria-hidden="true">
            <span className="switch-knob" />
          </span>
        </button>

        <button
          type="button"
          className="staple-toggle longlife-toggle"
          aria-pressed={longLife}
          onClick={() => {
            setLongLife((v) => !v)
            setLlTouched(true)
          }}
        >
          <span className="staple-toggle-icon">
            <IconClock size={17} />
          </span>
          <span className="staple-toggle-text">
            <strong>Long-life — keeps for ages</strong>
            <small>{longLife ? 'Not tracked for freshness.' : 'We track how fresh it stays.'}</small>
          </span>
          <span className={`switch ${longLife ? 'on' : ''}`} aria-hidden="true">
            <span className="switch-knob" />
          </span>
        </button>

        <div className="form-actions">
          {isEdit && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(item.id)}
              aria-label="Delete this item"
            >
              <IconTrash size={18} /> Delete
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-block">
            {isEdit ? 'Save changes' : 'Add to fridge'}
          </button>
        </div>
      </motion.form>
    </div>
  )
}

function prettyDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
