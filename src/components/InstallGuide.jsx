import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSheet } from '../lib/useSheet.js'
import { platform, canPrompt, promptInstall, iosNeedsSafari } from '../lib/install.js'
import { IconClose, IconCheck, IconFridge, IconWarning } from '../icons.jsx'

// "Add to your home screen" guide. People reach the app by scanning the QR on
// the marketing site, so most arrive in a mobile browser and don't know a PWA
// can be installed. This sheet lets them pick iPhone or Android and watch an
// animated walkthrough of exactly what to tap.

// Platform-specific glyphs (kept inline — they don't belong in the shared set).
const ShareGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V4" /><path d="M8.5 7.5 12 4l3.5 3.5" />
    <path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 11H17" />
  </svg>
)
const DotsGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
  </svg>
)

const GUIDE = {
  ios: {
    label: 'iPhone — Safari',
    note: 'On iPhone & iPad this only works in Safari (Apple’s rule) — but only this once. After it’s on your home screen you open it from there, never from Safari again.',
    steps: [
      <>In <b>Safari</b>, tap the <b>Share</b> button <span className="ig-inline"><ShareGlyph size={14} /></span> at the bottom.</>,
      <>Scroll down and tap <b>Add to Home Screen</b>.</>,
      <>Tap <b>Add</b> — done. Open it from your home screen like any app.</>
    ]
  },
  android: {
    label: 'Android — Chrome',
    note: 'For Google / Chrome on Android. Some phones say “Install app” instead.',
    steps: [
      <>In <b>Chrome</b>, tap the <b>⋮ menu</b> <span className="ig-inline"><DotsGlyph size={14} /></span> at the top-right.</>,
      <>Tap <b>Add to Home screen</b> (or <b>Install app</b>).</>,
      <>Tap <b>Add</b> — done. It lands on your home screen like any app.</>
    ]
  }
}

// The little looping phone demo. `phase` 0→1→2: tap the button → pick the
// option → it appears on the home screen.
function Demo({ os, phase }) {
  const target = os === 'ios' ? <ShareGlyph /> : <DotsGlyph />
  return (
    <div className="ig-demo">
      <div className="ig-phone"><div className="ig-screen">
        {os === 'android' && (
          <div className="ig-appbar">
            <span className="ig-url">whatsinmyfridge.co.uk</span>
            <span className="ig-target ig-target-android">
              {target}
              {phase === 0 && <motion.span className="ig-ring" layoutId="ring"
                animate={{ scale: [1, 1.6], opacity: [0.7, 0] }} transition={{ duration: 1, repeat: Infinity }} />}
            </span>
          </div>
        )}

        {/* faux page content */}
        <div className="ig-page">
          <div className="ig-ph ig-ph-title" />
          <div className="ig-ph" /><div className="ig-ph" /><div className="ig-ph ig-ph-short" />
          <div className="ig-ph-card" /><div className="ig-ph-card" />
        </div>

        {os === 'ios' && (
          <div className="ig-toolbar">
            <span className="ig-tb-ico">‹</span><span className="ig-tb-ico">›</span>
            <span className="ig-url ig-url-pill">whatsinmyfridge.co.uk</span>
            <span className="ig-target ig-target-ios">
              {target}
              {phase === 0 && <motion.span className="ig-ring"
                animate={{ scale: [1, 1.6], opacity: [0.7, 0] }} transition={{ duration: 1, repeat: Infinity }} />}
            </span>
          </div>
        )}

        <AnimatePresence>
          {/* phase 1 — the share sheet (iOS) / menu (Android) */}
          {phase === 1 && os === 'ios' && (
            <motion.div className="ig-share" key="share"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
              <div className="ig-grip" />
              <div className="ig-row">Copy</div>
              <motion.div className="ig-row ig-row-hot"
                animate={{ backgroundColor: ['var(--accent-soft)', 'var(--accent)', 'var(--accent-soft)'] }}
                transition={{ duration: 1.1, repeat: Infinity }}>
                <span className="ig-row-ico"><PlusSquare /></span> Add to Home Screen
              </motion.div>
              <div className="ig-row">Add to Reading List</div>
            </motion.div>
          )}
          {phase === 1 && os === 'android' && (
            <motion.div className="ig-menu" key="menu"
              initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}>
              <div className="ig-mrow">New tab</div>
              <motion.div className="ig-mrow ig-mrow-hot"
                animate={{ backgroundColor: ['var(--accent-soft)', 'var(--accent)', 'var(--accent-soft)'] }}
                transition={{ duration: 1.1, repeat: Infinity }}>
                <span className="ig-row-ico"><PlusSquare /></span> Add to Home screen
              </motion.div>
              <div className="ig-mrow">Downloads</div>
            </motion.div>
          )}

          {/* phase 2 — it's on the home screen */}
          {phase === 2 && (
            <motion.div className="ig-homescreen" key="home"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="ig-grid">
                <span className="ig-app ig-app-ghost" /><span className="ig-app ig-app-ghost" /><span className="ig-app ig-app-ghost" />
                <motion.span className="ig-app ig-app-ours"
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.15 }}>
                  <span className="ig-app-tile"><IconFridge size={22} /></span>
                  <span className="ig-app-name">Fridge</span>
                </motion.span>
                <span className="ig-app ig-app-ghost" /><span className="ig-app ig-app-ghost" />
              </div>
              <motion.div className="ig-done"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 16 }}>
                <IconCheck size={16} /> Added
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div></div>
    </div>
  )
}

const PlusSquare = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" />
  </svg>
)

export default function InstallGuide({ onClose }) {
  const ref = useSheet(onClose)
  const [os, setOs] = useState(() => (platform() === 'android' ? 'android' : 'ios'))
  const [phase, setPhase] = useState(0)
  const [installing, setInstalling] = useState(false)
  const [copied, setCopied] = useState(false)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const showInstallBtn = os === 'android' && canPrompt()
  // iPhone users in Chrome/Firefox/etc can't "Add to Home Screen" — only Safari
  // can. Show them how to switch to Safari first.
  const needSafari = os === 'ios' && iosNeedsSafari()

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — they can still type the address into Safari */
    }
  }

  // Loop the demo through its three phases (skip the motion if reduced).
  useEffect(() => {
    if (reduce) { setPhase(2); return }
    setPhase(0)
    const order = [0, 1, 2]
    let i = 0
    const id = setInterval(() => { i = (i + 1) % order.length; setPhase(order[i]) }, 1600)
    return () => clearInterval(id)
  }, [os, reduce])

  async function install() {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    if (outcome === 'accepted') onClose()
  }

  const g = GUIDE[os]

  return (
    <div className="scrim" onClick={onClose}>
      <motion.div
        className="sheet ig-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="sheet-header">
          <h2 id="install-title">Keep it one tap away</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <p className="ig-lede">Add <b>What’s in my Fridge</b> to your home screen so it opens full-screen, like a normal app — no app store needed.</p>

        {needSafari && (
          <div className="ig-safari" role="note">
            <IconWarning size={18} />
            <div>
              <strong>Adding to your home screen needs Safari — just this once.</strong> Apple only lets you add web
              apps from Safari, not Chrome. Copy the link, open it in <b>Safari</b> and follow the steps below.
              You’ll never need Safari again — after that you open the app from your home screen.
              <button type="button" className="ig-copy" onClick={copyLink}>
                {copied ? '✓ Link copied — now open Safari' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        <div className="ig-toggle" role="tablist" aria-label="Choose your phone">
          {['ios', 'android'].map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={os === key}
              className={`ig-tab ${os === key ? 'on' : ''}`}
              onClick={() => setOs(key)}
            >
              {GUIDE[key].label}
            </button>
          ))}
        </div>

        <Demo os={os} phase={phase} />

        <ol className="ig-steps">
          {g.steps.map((s, i) => (
            <li key={i} className={phase === i ? 'now' : ''}>
              <span className="ig-step-n">{i + 1}</span>
              <span className="ig-step-t">{s}</span>
            </li>
          ))}
        </ol>

        <p className="ig-note">{g.note}</p>

        {showInstallBtn && (
          <button className="btn btn-primary btn-block" onClick={install} disabled={installing} style={{ marginBottom: 10 }}>
            {installing ? 'Opening…' : 'Install app'}
          </button>
        )}
        <button className="btn btn-ghost btn-block" onClick={onClose}>Got it</button>
      </motion.div>
    </div>
  )
}
