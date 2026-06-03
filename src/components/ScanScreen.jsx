import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { detectFromImage } from '../lib/api.js'
import { downscaleImage } from '../lib/image.js'
import { store } from '../lib/store.js'
import { CATEGORIES, LOCATIONS, suggestExpiry } from '../lib/categories.js'
import { IconCamera, IconReceipt, IconPlus, IconCheck, IconClose, IconSparkle, IconWarning } from '../icons.jsx'

// phases: idle -> reading -> confirm  (error can interrupt reading)
export default function ScanScreen({ onDone, onAddManual }) {
  const [phase, setPhase] = useState('idle')
  const [mode, setMode] = useState('groceries') // 'groceries' | 'receipt'
  const [preview, setPreview] = useState(null)
  const [detected, setDetected] = useState([])
  const [error, setError] = useState(null)
  const [location, setLocation] = useState('fridge')
  const fileRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setPhase('reading')
    try {
      const { dataUrl, mediaType, base64 } = await downscaleImage(file)
      setPreview(dataUrl)
      const items = await detectFromImage(base64, mediaType, mode)
      setDetected(
        items.map((it, i) => ({
          ...it,
          _id: `${i}-${it.name}`,
          include: it.confidence >= 0.4 // pre-untick the very unsure ones
        }))
      )
      setPhase('confirm')
    } catch (err) {
      setError(err.message)
      setPhase('error')
    }
  }

  function confirm() {
    const chosen = detected.filter((d) => d.include && d.name.trim())
    if (chosen.length) {
      store.addMany(
        chosen.map((d) => ({
          name: d.name.trim(),
          category: d.category,
          quantity: d.quantity || 1,
          unit: d.unit || '',
          location,
          expiry_date: suggestExpiry(d.category, location),
          source: 'photo',
          confidence: d.confidence
        }))
      )
    }
    reset()
    onDone()
  }

  function reset() {
    setPhase('idle')
    setPreview(null)
    setDetected([])
    setError(null)
  }

  const chosenCount = detected.filter((d) => d.include && d.name.trim()).length

  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <h1 className="app-title">Scan</h1>
          <p className="app-subtitle">
            {phase === 'confirm' ? 'Check what I saw, then confirm.' : 'A photo proposes items — you decide.'}
          </p>
        </div>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {phase === 'idle' && (
        <>
          <div className="segment" role="tablist" aria-label="What are you scanning?" style={{ display: 'flex', width: '100%' }}>
            <button
              role="tab"
              aria-pressed={mode === 'groceries'}
              onClick={() => setMode('groceries')}
              style={{ flex: 1 }}
            >
              Fridge / groceries
            </button>
            <button role="tab" aria-pressed={mode === 'receipt'} onClick={() => setMode('receipt')} style={{ flex: 1 }}>
              Receipt
            </button>
          </div>

          <div className="scan-drop">
            <div className="empty-art">
              {mode === 'receipt' ? <IconReceipt size={32} /> : <IconCamera size={32} />}
            </div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18 }}>
              {mode === 'receipt' ? 'Snap your shopping receipt' : 'Snap your fridge or shopping'}
            </h3>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, maxWidth: '34ch' }}>
              {mode === 'receipt'
                ? "I'll read every item on the receipt and log it. Lay it flat and get the whole list in frame."
                : "I'll list what I can see. For a fresh shop, the receipt mode is usually more accurate."}
            </p>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              <IconCamera size={19} /> {mode === 'receipt' ? 'Take or choose a receipt photo' : 'Take or choose a photo'}
            </button>
            <button className="btn-text" onClick={onAddManual}>
              or add an item by hand
            </button>
          </div>
        </>
      )}

      {(phase === 'reading' || phase === 'error') && (
        <div className="scan-preview">
          <img src={preview} alt="The photo you just took, being read for food items" />
          {phase === 'reading' && (
            <div className="scan-busy">
              <Spinner />
              Reading the photo…
            </div>
          )}
        </div>
      )}

      {phase === 'error' && (
        <>
          <div className="banner" role="alert" style={{ marginTop: 16 }}>
            <IconWarning size={18} />
            <span>{error}</span>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost btn-block" onClick={reset}>
              Try another photo
            </button>
          </div>
        </>
      )}

      {phase === 'confirm' && (
        <ConfirmList
          detected={detected}
          setDetected={setDetected}
          location={location}
          setLocation={setLocation}
          chosenCount={chosenCount}
          onConfirm={confirm}
          onCancel={reset}
        />
      )}
    </div>
  )
}

function ConfirmList({ detected, setDetected, location, setLocation, chosenCount, onConfirm, onCancel }) {
  function patch(id, change) {
    setDetected((list) => list.map((d) => (d._id === id ? { ...d, ...change } : d)))
  }
  function addBlank() {
    setDetected((list) => [
      ...list,
      { _id: `manual-${list.length}-${Date.now()}`, name: '', category: 'other', quantity: 1, unit: '', confidence: 1, include: true }
    ])
  }

  if (detected.length === 0) {
    return (
      <div className="empty">
        <div className="empty-art">
          <IconSparkle size={30} />
        </div>
        <h3>Nothing clear to add</h3>
        <p>I couldn't make out distinct items. Try a closer, brighter shot — or add them by hand.</p>
        <div className="empty-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Try again
          </button>
          <button className="btn btn-primary" onClick={addBlank}>
            <IconPlus size={18} /> Add one anyway
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="field" style={{ marginTop: 4 }}>
        <label>Putting these in</label>
        <div className="chips">
          {LOCATIONS.map((l) => (
            <button key={l.key} type="button" className="chip" aria-pressed={location === l.key} onClick={() => setLocation(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '4px 14px', boxShadow: 'var(--shadow-sm)' }}>
        {detected.map((d) => (
          <ConfirmRow key={d._id} item={d} onPatch={(c) => patch(d._id, c)} />
        ))}
      </div>

      <button className="btn-text" style={{ marginTop: 10 }} onClick={addBlank}>
        <IconPlus size={16} /> Add something the photo missed
      </button>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          <IconClose size={18} />
        </button>
        <button className="btn btn-primary btn-block" onClick={onConfirm} disabled={chosenCount === 0}>
          {chosenCount > 0 ? `Add ${chosenCount} ${chosenCount === 1 ? 'item' : 'items'}` : 'Tick items to add'}
        </button>
      </div>
    </>
  )
}

function ConfirmRow({ item, onPatch }) {
  const low = item.confidence < 0.6
  return (
    <motion.div layout className={`confirm-item ${item.include ? '' : 'off'}`}>
      <button
        className="check"
        role="checkbox"
        aria-checked={item.include}
        aria-label={`Include ${item.name || 'this item'}`}
        onClick={() => onPatch({ include: !item.include })}
      >
        {item.include && <IconCheck size={17} />}
      </button>
      <div>
        <input
          className="confirm-name"
          value={item.name}
          placeholder="Item name"
          onChange={(e) => onPatch({ name: e.target.value })}
          aria-label="Item name"
        />
        <div className="confirm-sub">
          <select
            value={item.category}
            onChange={(e) => onPatch({ category: e.target.value })}
            aria-label="Category"
            style={{ border: 0, background: 'none', color: 'var(--ink-soft)', fontWeight: 600, fontSize: 12, padding: 0 }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          {low && (
            <span className="confidence-flag">
              <IconWarning size={12} /> not sure
            </span>
          )}
        </div>
      </div>
      <input
        type="number"
        min="0"
        step="any"
        value={item.quantity}
        onChange={(e) => onPatch({ quantity: Number(e.target.value) || 1 })}
        aria-label="Quantity"
        className="input"
        style={{ width: 58, padding: '8px', textAlign: 'center' }}
      />
    </motion.div>
  )
}

function Spinner() {
  return (
    <motion.div
      style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.35)', borderTopColor: '#fff' }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
    />
  )
}

