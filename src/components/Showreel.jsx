import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCheck } from '../icons.jsx'

// A self-playing, looping product demo of every USP. Each phone screen is a
// realistic mock of the app, and its CONTENTS animate in as the slide appears
// (items populate, the camera detects food, checkboxes tick on) — like the
// website. Variable pacing, no timer. Open at /?showreel and screen-record it.
// Full-screen, no app chrome, no sign-in; gated on the query flag in App.

// Staggered entrance for a list row / card.
const rowIn = (i) => ({
  initial: { opacity: 0, y: 9 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.15 + i * 0.11, duration: 0.34, ease: [0.22, 1, 0.36, 1] }
})

const ScrHead = ({ tab }) => (
  <div className="scr-head">
    <span className="scr-brand">Fridge<span className="reel-leaf">.</span></span>
    <span className="scr-tab">{tab}</span>
  </div>
)

// A checkbox that pops in green when on (delayed, so it looks like it's being
// ticked), or sits as an empty box when off.
const Tick = ({ on, i }) =>
  on ? (
    <motion.span
      className="scr-check on"
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.55 + i * 0.17, type: 'spring', stiffness: 480, damping: 22 }}
    >
      <IconCheck size={11} />
    </motion.span>
  ) : (
    <span className="scr-check" />
  )

// --- the app screens shown inside the phone --------------------------------

function CamScreen() {
  const food = ['🥬', '🍅', '🥚', '🥛', '🍞', '🫑', '🥕', '🧀', '🍓']
  const chips = ['✓ Eggs', '✓ Milk', '✓ Peppers', '✓ Cheddar']
  return (
    <div className="cam">
      <div className="cam-top"><span className="cam-rec">● AI scanning your shopping</span></div>
      <div className="cam-frame">
        <span className="cam-corner tl" /><span className="cam-corner tr" />
        <span className="cam-corner bl" /><span className="cam-corner br" />
        <motion.div className="cam-food" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          {food.map((f, i) => <span key={i}>{f}</span>)}
        </motion.div>
      </div>
      <div className="cam-chips">
        {chips.map((c, i) => (
          <motion.span
            key={c}
            className="cam-chip"
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.28, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <div className="cam-shutter"><span /></div>
    </div>
  )
}

function StockScreen() {
  const rows = [['🥛', 'Whole milk', 'Fridge', ''], ['🥚', 'Eggs', 'Fridge', ''], ['🧀', 'Cheddar', 'Fridge', ''], ['🥬', 'Spinach', 'Fridge', 'soon'], ['🍅', 'Tomatoes', 'Pantry', '']]
  return (
    <div className="scr">
      <ScrHead tab="In stock · 12" />
      <ul className="scr-list">
        {rows.map((r, i) => (
          <motion.li key={i} className="scr-row" {...rowIn(i)}>
            <span className="scr-emoji">{r[0]}</span>
            <span className="scr-name">{r[1]}</span>
            {r[3] === 'soon' ? <span className="scr-chip soon">Use soon</span> : <span className="scr-meta">{r[2]}</span>}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function FreshScreen() {
  const rows = [['🍗', 'Chicken breast', 'today', 'Use today'], ['🥬', 'Spinach', 'soon', 'Tomorrow'], ['🍓', 'Strawberries', 'soon', '2 days'], ['🥛', 'Milk', '', '5 days']]
  return (
    <div className="scr">
      <ScrHead tab="Use soon" />
      <motion.div className="scr-banner" {...rowIn(0)}>⚠ 2 items to use up</motion.div>
      <ul className="scr-list">
        {rows.map((r, i) => (
          <motion.li key={i} className="scr-row" {...rowIn(i + 1)}>
            <span className="scr-emoji">{r[0]}</span>
            <span className="scr-name">{r[1]}</span>
            {r[2] ? <span className={`scr-chip ${r[2]}`}>{r[3]}</span> : <span className="scr-meta">{r[3]}</span>}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function EssentialsScreen() {
  const rows = [['🥛', 'Milk', 'Running low'], ['🍞', 'Bread', 'Out'], ['🧈', 'Butter', 'Running low'], ['🥚', 'Eggs', 'Out']]
  return (
    <div className="scr">
      <ScrHead tab="Essentials" />
      <ul className="scr-list">
        {rows.map((r, i) => (
          <motion.li key={i} className="scr-row" {...rowIn(i)}>
            <span className="scr-emoji">{r[0]}</span>
            <span className="scr-name">{r[1]}<span className="scr-sub2"> · {r[2]}</span></span>
            <motion.span className="scr-add" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 + i * 0.11 }}>+ Add</motion.span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function ListScreen() {
  const rows = [['Milk', true], ['Bread', true], ['Eggs', false], ['Butter', false], ['Tomatoes', false]]
  return (
    <div className="scr">
      <ScrHead tab="My list" />
      <ul className="scr-list">
        {rows.map((r, i) => (
          <motion.li key={i} className={`scr-row ${r[1] ? 'done' : ''}`} {...rowIn(i)}>
            <Tick on={r[1]} i={i} />
            <span className="scr-name">{r[0]}</span>
          </motion.li>
        ))}
      </ul>
      <motion.div className="scr-cta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>🧊 Put 2 away</motion.div>
    </div>
  )
}

function MealsScreen() {
  const meals = [['Creamy garlic chicken pasta', 'Uses: chicken, cream, garlic, pasta'], ['Veg & egg shakshuka', 'Uses: eggs, peppers, tomatoes']]
  return (
    <div className="scr">
      <ScrHead tab="Dinner ideas" />
      {meals.map((m, i) => (
        <motion.div key={i} className="scr-meal" {...rowIn(i)}>
          <h4>{m[0]}</h4>
          <p>{m[1]}</p>
        </motion.div>
      ))}
      <motion.div className="scr-cta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>View recipe</motion.div>
    </div>
  )
}

function DietScreen() {
  const rows = [['Vegetarian', true], ['Vegan', false], ['Gluten-free', true], ['Dairy-free', false], ['No nuts', true]]
  return (
    <div className="scr">
      <ScrHead tab="Dietary preferences" />
      <ul className="scr-list">
        {rows.map((r, i) => (
          <motion.li key={i} className="scr-row" {...rowIn(i)}>
            <span className="scr-name">{r[0]}</span>
            <Tick on={r[1]} i={i} />
          </motion.li>
        ))}
      </ul>
      <motion.div className="scr-cta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>Save preferences</motion.div>
    </div>
  )
}

// --- slides: variable durations so it doesn't feel evenly timed -------------

const SLIDES = [
  { key: 'intro', dur: 2.8, intro: true },
  { key: 'scan', dur: 4.6, title: 'A photo does the typing', sub: 'Point your camera at the shopping and AI reads every item in seconds — no typing, ever.', screen: <CamScreen /> },
  { key: 'know', dur: 3.6, title: 'Always know what you’ve got', sub: 'Fridge, freezer and pantry in one tidy list that’s always up to date.', screen: <StockScreen /> },
  { key: 'fresh', dur: 4.0, title: 'Use it before you lose it', sub: 'Everything’s tracked by freshness — whatever’s about to turn floats to the top.', screen: <FreshScreen /> },
  { key: 'staples', dur: 3.6, title: 'Never run out of essentials', sub: 'It learns the things you always keep and flags them the moment you’re low.', screen: <EssentialsScreen /> },
  { key: 'shop', dur: 3.8, title: 'Shop it, then restock it', sub: 'Tick items off as you buy, then file the whole shop back into your fridge in one tap.', screen: <ListScreen /> },
  { key: 'meals', dur: 4.8, title: 'Dinner from what you’ve got', sub: 'Stuck for ideas? Get real recipes built around what’s already in your fridge.', screen: <MealsScreen /> },
  { key: 'diet', dur: 4.2, title: 'Cooks for your diet', sub: 'Vegetarian, gluten-free, allergic to nuts? Every meal idea respects it.', screen: <DietScreen /> }
]

export default function Showreel() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), (SLIDES[i].dur || 3.8) * 1000)
    return () => clearTimeout(t)
  }, [i])

  const slide = SLIDES[i]

  return (
    <div className="reel">
      <AnimatePresence mode="wait">
        {slide.intro ? (
          <motion.div
            key="intro"
            className="reel-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span className="reel-intro-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              Welcome to
            </motion.span>
            <motion.h1 className="reel-intro-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              What’s in my Fridge
            </motion.h1>
            <motion.p className="reel-intro-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
              Snap it · track it · cook it · waste less
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key={slide.key}
            className="reel-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="reel-stage">
              <div className="reel-slide">
                <div className="reel-phone">
                  <div className="reel-screen">{slide.screen}</div>
                </div>
                <h1 className="reel-title">{slide.title}</h1>
                <p className="reel-sub">{slide.sub}</p>
              </div>
            </div>
            <div className="reel-foot">whatsinmyfridge.co.uk</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
