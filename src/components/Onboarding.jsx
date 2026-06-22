import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconFridge, IconCamera, IconReceipt, IconClock, IconSparkle,
  IconPin, IconCart, IconCheck, IconPlus
} from '../icons.jsx'

// First-run intro: a 5-slide pitch of why you'd use the app, each slide showing
// the feature it's talking about. Swipe or tap Next; "Get started" finishes.

const SLIDES = [
  {
    key: 'dinner',
    Icon: IconCamera,
    tag: 'Always free',
    title: "Tonight's dinner, sorted",
    body:
      'Snap whatever you fancy cooking with — the veg, the meat, the bits in the fridge — and the AI turns it into real meal ideas, plus the few things you still need. This bit’s free, always.',
    visual: <DinnerVisual />
  },
  {
    key: 'fridge',
    Icon: IconFridge,
    tag: 'Plus · free to try',
    title: 'Track your whole fridge',
    body:
      'Keep a running list of what you’ve got so you never double-buy — and whatever’s about to go off floats to the top, so good food stops ending up in the bin.',
    visual: <FreshVisual />
  },
  {
    key: 'list',
    Icon: IconCart,
    tag: 'Plus · free to try',
    title: 'A list that refills your fridge',
    body:
      'Save what you need, tick it off at the shops, and watch it file straight back into your fridge — no re-typing.',
    visual: <ShopVisual />
  },
  {
    key: 'staples',
    Icon: IconSparkle,
    tag: 'Plus · free to try',
    title: 'Never run out of the usuals',
    body:
      'It learns the essentials you always keep — milk, bread, butter — and flags them the moment you’re running low.',
    visual: <StaplesVisual />
  },
  {
    key: 'trial',
    Icon: IconSparkle,
    title: 'Try the whole app free for 14 days',
    body:
      'Everything’s on us for two weeks. After that, dinner-from-a-photo stays free — keep the fridge, the list and the rest with Plus for £3.99/month. No card needed to start.',
    visual: <TrialVisual />
  }
]

const variants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-40%' : '40%', opacity: 0 })
}

export default function Onboarding({ onDone, onNeverShow }) {
  const [[page, dir], setPage] = useState([0, 0])
  const slide = SLIDES[page]
  const last = page === SLIDES.length - 1

  function go(nextDir) {
    const next = page + nextDir
    if (next < 0) return
    if (next >= SLIDES.length) return onDone()
    setPage([next, nextDir])
  }
  function jump(to) {
    if (to !== page) setPage([to, to > page ? 1 : -1])
  }

  return (
    <div className="onboard">
      <div className="onboard-top">
        <span className="onboard-brand">
          What's in my Fridge<span className="leaf">.</span>
        </span>
        {!last && (
          <button className="onboard-skip" onClick={onDone}>
            Skip
          </button>
        )}
      </div>

      <div className="onboard-stage">
        <AnimatePresence custom={dir} mode="popLayout" initial={false}>
          <motion.div
            key={slide.key}
            className="onboard-slide"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 34, opacity: { duration: 0.18 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -70 || info.velocity.x < -500) go(1)
              else if (info.offset.x > 70 || info.velocity.x > 500) go(-1)
            }}
          >
            <div className="onboard-visual">{slide.visual}</div>
            <div className="onboard-badge">
              <slide.Icon size={20} />
            </div>
            {slide.tag && <span className={`ob-tag ${slide.tag === 'Always free' ? 'free' : 'plus'}`}>{slide.tag}</span>}
            <h1 className="onboard-title">{slide.title}</h1>
            <p className="onboard-body">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="onboard-foot">
        <div className="onboard-dots">
          {SLIDES.map((s, idx) => (
            <button
              key={s.key}
              className={`onboard-dot ${idx === page ? 'on' : ''}`}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => jump(idx)}
            />
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => go(1)}>
          {last ? 'Get started' : 'Next'}
        </button>
        {onNeverShow && (
          <button className="onboard-never" onClick={onNeverShow}>
            Don’t show this again
          </button>
        )}
      </div>
    </div>
  )
}

// --- little feature mock-ups shown on each slide --------------------------

export function KnowVisual() {
  const rows = [
    { name: 'Whole milk', where: 'Fridge' },
    { name: 'Eggs', where: 'Fridge' },
    { name: 'Cheddar', where: 'Fridge' }
  ]
  return (
    <div className="ob-card">
      {rows.map((r) => (
        <div className="ob-line" key={r.name}>
          <span className="ob-line-name">{r.name}</span>
          <span className="ob-line-meta">{r.where}</span>
        </div>
      ))}
    </div>
  )
}

function DinnerVisual() {
  return (
    <div className="ob-card">
      <div className="ob-line">
        <span className="ob-line-name">Tomato &amp; basil pasta</span>
        <span className="ob-pill ob-pill-accent ob-pill-sm"><IconSparkle size={12} /> AI</span>
      </div>
      <div className="ob-line">
        <span className="ob-line-meta">Uses your pasta, tomatoes &amp; garlic</span>
      </div>
      <div className="ob-line">
        <span className="ob-line-name"><IconCart size={13} /> To buy: parmesan</span>
      </div>
    </div>
  )
}

export function AddVisual() {
  return (
    <div className="ob-card ob-add">
      <span className="ob-pill ob-pill-accent"><IconCamera size={15} /> Snap shopping</span>
      <span className="ob-pill"><IconReceipt size={15} /> Receipt</span>
      <span className="ob-pill"><IconPlus size={15} /> By hand</span>
    </div>
  )
}

export function FreshVisual() {
  return (
    <div className="ob-card">
      <div className="ob-line">
        <span className="ob-line-name">Spinach</span>
        <span className="ob-chip soon"><IconClock size={12} /> Use by tomorrow</span>
      </div>
      <div className="ob-line">
        <span className="ob-line-name">Chicken breast</span>
        <span className="ob-chip expired"><IconClock size={12} /> Use today</span>
      </div>
    </div>
  )
}

export function StaplesVisual() {
  return (
    <div className="ob-card ob-staple">
      <div className="ob-staple-head">
        <IconSparkle size={15} /> Running low on the usuals
      </div>
      <div className="ob-line">
        <span className="ob-line-name"><IconPin size={13} /> Milk</span>
        <span className="ob-pill ob-pill-accent ob-pill-sm"><IconCart size={13} /> Add</span>
      </div>
    </div>
  )
}

export function ShopVisual() {
  return (
    <div className="ob-card">
      <div className="ob-line">
        <span className="ob-line-name"><span className="ob-check"><IconCheck size={12} /></span> Milk</span>
      </div>
      <div className="ob-line">
        <span className="ob-line-name"><span className="ob-check"><IconCheck size={12} /></span> Bread</span>
      </div>
      <div className="ob-putaway"><IconFridge size={14} /> Put 2 away</div>
    </div>
  )
}

function TrialVisual() {
  return (
    <div className="ob-card ob-staple">
      <div className="ob-staple-head">
        <IconSparkle size={15} /> Full app free — 14 days
      </div>
      <div className="ob-line">
        <span className="ob-line-name">Dinner from a photo</span>
        <span className="ob-line-meta">Free forever</span>
      </div>
      <div className="ob-line">
        <span className="ob-line-name">Fridge, list &amp; more</span>
        <span className="ob-line-meta">Plus · £3.99/mo</span>
      </div>
    </div>
  )
}
