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
    key: 'know',
    Icon: IconFridge,
    title: "Never wonder what's in your fridge",
    body:
      "Your fridge, freezer and pantry — all in one place, always up to date. No more standing in the shop trying to remember if you've already got eggs.",
    visual: <KnowVisual />
  },
  {
    key: 'add',
    Icon: IconCamera,
    title: 'Just back from the shop?',
    body:
      'Lay your shopping out and snap it — or photograph the receipt — and it lists everything for you in seconds. Your fridge shelves work too, or add by hand.',
    visual: <AddVisual />
  },
  {
    key: 'fresh',
    Icon: IconClock,
    title: 'Use it before you lose it',
    body:
      'Every item gets a use-by date, and whatever’s about to go off floats to the top — so good food stops ending up in the bin.',
    visual: <FreshVisual />
  },
  {
    key: 'staples',
    Icon: IconSparkle,
    title: 'Never run out of the essentials',
    body:
      'It learns the staples you always keep — milk, bread, butter — and flags them the moment you run low. Or pin your own.',
    visual: <StaplesVisual />
  },
  {
    key: 'shop',
    Icon: IconCart,
    title: 'List it, shop it, restock it',
    body:
      'Send what’s missing to your shopping list, tick it off as you buy, then pop it straight back in your fridge. Stuck for dinner? Ask what you can make.',
    visual: <ShopVisual />
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

function KnowVisual() {
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

function AddVisual() {
  return (
    <div className="ob-card ob-add">
      <span className="ob-pill ob-pill-accent"><IconCamera size={15} /> Snap shopping</span>
      <span className="ob-pill"><IconReceipt size={15} /> Receipt</span>
      <span className="ob-pill"><IconPlus size={15} /> By hand</span>
    </div>
  )
}

function FreshVisual() {
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

function StaplesVisual() {
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

function ShopVisual() {
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
