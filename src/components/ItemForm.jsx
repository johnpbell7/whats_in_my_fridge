import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CATEGORIES, LOCATIONS, suggestExpiry } from '../lib/categories.js'
import { suggestLocation } from '../lib/location.js'
import { IconClose, IconTrash } from '../icons.jsx'

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

  // While adding a new item, keep filing it to the smart location as the name
  // and category change — until the user picks a location themselves.
  useEffect(() => {
    if (!isEdit && !locTouched) setLocation(suggestLocation(name, category))
  }, [name, category, isEdit, locTouched])

  const suggestion = suggestExpiry(category, location)
  const nameError = touched && !name.trim()

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setTouched(true)
      return
    }
    onSave(
      {
        name: name.trim(),
        category,
        quantity: Number(quantity) || 1,
        unit: unit.trim(),
        location,
        expiry_date: expiry || null,
        notes: notes.trim()
      },
      item?.id
    )
  }

  return (
    <div className="scrim" onClick={onClose}>
      <motion.form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2>{isEdit ? 'Edit item' : 'Add an item'}</h2>
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
          <label htmlFor="f-expiry">Use by</label>
          <input
            id="f-expiry"
            className="input"
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
          <p className="expiry-suggest">
            {expiry === suggestion ? (
              <>Suggested from category &amp; location.</>
            ) : (
              <>
                Not sure?{' '}
                <button type="button" onClick={() => setExpiry(suggestion)}>
                  Use the {prettyDate(suggestion)} estimate
                </button>
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

        <div className="form-actions">
          {isEdit && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(item.id)}
              aria-label="Delete this item"
            >
              <IconTrash size={18} />
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
