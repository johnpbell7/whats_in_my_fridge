import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSheet } from '../lib/useSheet.js'
import { reportProblem } from '../lib/api.js'
import { IconClose, IconCheck, IconWarning } from '../icons.jsx'

// Preset issue types — keep these short and user-facing. The server accepts the
// label as-is, so tweaking this list needs no backend change.
const ISSUES = [
  'Scanning a photo or receipt',
  'Chat / meal ideas',
  'Shopping list',
  'Freshness / dates',
  'Payments or subscription',
  'Logging in / my account',
  'Something looks wrong',
  'Other'
]

// "Report a problem" sheet — pick what it's about, describe it, and it's emailed
// to support with your address as reply-to.
export default function ReportSheet({ onClose }) {
  const ref = useSheet(onClose)
  const [type, setType] = useState(ISSUES[0])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!message.trim() || busy) return
    setBusy(true)
    setErr(null)
    try {
      await reportProblem(type, message.trim())
      setDone(true)
    } catch (e2) {
      setErr(e2.message || 'Could not send right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <motion.form
        className="sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
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
          <h2 id="report-title">Report a problem</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        {done ? (
          <div className="empty" style={{ paddingTop: 12 }}>
            <div className="empty-art"><IconCheck size={28} /></div>
            <h3>Thanks — we've got it</h3>
            <p>We'll take a look. If it needs a reply, we'll email you back.</p>
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="field">
              <label>What's it about?</label>
              <div className="chips">
                {ISSUES.map((i) => (
                  <button key={i} type="button" className="chip" aria-pressed={type === i} onClick={() => setType(i)}>
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="report-msg">Tell us what happened</label>
              <textarea
                id="report-msg"
                className="textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What went wrong, and what were you doing when it happened?"
                rows={4}
                autoFocus
              />
            </div>

            {err && (
              <p className="account-note account-data-err">
                <IconWarning size={13} /> {err}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={!message.trim() || busy}>
              {busy ? 'Sending…' : 'Send report'}
            </button>
          </>
        )}
      </motion.form>
    </div>
  )
}
