import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCheck } from '../icons.jsx'

// A self-playing, looping product demo of every USP — a realistic phone mockup
// of the actual app screen, with a descriptive headline underneath (like the
// website). Variable pacing (no rigid timer feel). Open at /?showreel and
// screen-record it. Full-screen, no app chrome, no sign-in; gated on the query
// flag in App so normal users never see it.

const ScrHead = ({ tab }) => (
  <div className="scr-head">
    <span className="scr-brand">Fridge<span className="reel-leaf">.</span></span>
    <span className="scr-tab">{tab}</span>
  </div>
)

// --- the app screens shown inside the phone --------------------------------

function CamScreen() {
  const food = ['🥬', '🍅', '🥚', '🥛', '🍞', '🫑', '🥕', '🧀', '🍓']
  return (
    <div className="cam">
      <div className="cam-top"><span className="cam-rec">● AI scanning your shopping</span></div>
      <div className="cam-frame">
        <span className="cam-corner tl" /><span className="cam-corner tr" />
        <span className="cam-corner bl" /><span className="cam-corner br" />
        <div className="cam-food">{food.map((f, i) => <span key={i}>{f}</span>)}</div>
      </div>
      <div className="cam-chips">
        <span className="cam-chip">✓ Eggs</span>
        <span className="cam-chip">✓ Milk</span>
        <span className="cam-chip">✓ Peppers</span>
        <span className="cam-chip">✓ Cheddar</span>
      </div>
      <div className="cam-shutter"><span /></div>
    </div>
  )
}

function StockScreen() {
  const rows = [
    ['🥛', 'Whole milk', 'Fridge', ''],
    ['🥚', 'Eggs', 'Fridge', ''],
    ['🧀', 'Cheddar', 'Fridge', ''],
    ['🥬', 'Spinach', 'Fridge', 'soon'],
    ['🍅', 'Tomatoes', 'Pantry', '']
  ]
  return (
    <div className="scr">
      <ScrHead tab="In stock · 12" />
      <ul className="scr-list">
        {rows.map((r, i) => (
          <li key={i} className="scr-row">
            <span className="scr-emoji">{r[0]}</span>
            <span className="scr-name">{r[1]}</span>
            {r[3] === 'soon' ? <span className="scr-chip soon">Use soon</span> : <span className="scr-meta">{r[2]}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FreshScreen() {
  return (
    <div className="scr">
      <ScrHead tab="Use soon" />
      <div className="scr-banner">⚠ 2 items to use up</div>
      <ul className="scr-list">
        <li className="scr-row"><span className="scr-emoji">🍗</span><span className="scr-name">Chicken breast</span><span className="scr-chip today">Use today</span></li>
        <li className="scr-row"><span className="scr-emoji">🥬</span><span className="scr-name">Spinach</span><span className="scr-chip soon">Tomorrow</span></li>
        <li className="scr-row"><span className="scr-emoji">🍓</span><span className="scr-name">Strawberries</span><span className="scr-chip soon">2 days</span></li>
        <li className="scr-row"><span className="scr-emoji">🥛</span><span className="scr-name">Milk</span><span className="scr-meta">5 days</span></li>
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
          <li key={i} className="scr-row">
            <span className="scr-emoji">{r[0]}</span>
            <span className="scr-name">{r[1]}<span className="scr-sub2"> · {r[2]}</span></span>
            <span className="scr-add">+ Add</span>
          </li>
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
          <li key={i} className={`scr-row ${r[1] ? 'done' : ''}`}>
            <span className={`scr-check ${r[1] ? 'on' : ''}`}>{r[1] && <IconCheck size={11} />}</span>
            <span className="scr-name">{r[0]}</span>
          </li>
        ))}
      </ul>
      <div className="scr-cta">🧊 Put 2 away</div>
    </div>
  )
}

function MealsScreen() {
  return (
    <div className="scr">
      <ScrHead tab="Dinner ideas" />
      <div className="scr-meal">
        <h4>Creamy garlic chicken pasta</h4>
        <p>Uses: chicken, cream, garlic, pasta</p>
      </div>
      <div className="scr-meal">
        <h4>Veg &amp; egg shakshuka</h4>
        <p>Uses: eggs, peppers, tomatoes</p>
      </div>
      <div className="scr-cta">View recipe</div>
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
          <li key={i} className="scr-row">
            <span className="scr-name">{r[0]}</span>
            <span className={`scr-check ${r[1] ? 'on' : ''}`}>{r[1] && <IconCheck size={11} />}</span>
          </li>
        ))}
      </ul>
      <div className="scr-cta">Save preferences</div>
    </div>
  )
}

// --- slides: variable durations so it doesn't feel evenly timed -------------

const SLIDES = [
  { key: 'scan', dur: 4.4, title: 'A photo does the typing', sub: 'Point your camera at the shopping and AI reads every item in seconds — no typing, ever.', screen: <CamScreen /> },
  { key: 'know', dur: 3.4, title: 'Always know what you’ve got', sub: 'Fridge, freezer and pantry in one tidy list that’s always up to date.', screen: <StockScreen /> },
  { key: 'fresh', dur: 3.8, title: 'Use it before you lose it', sub: 'Everything’s tracked by freshness — whatever’s about to turn floats to the top.', screen: <FreshScreen /> },
  { key: 'staples', dur: 3.4, title: 'Never run out of essentials', sub: 'It learns the things you always keep and flags them the moment you’re low.', screen: <EssentialsScreen /> },
  { key: 'shop', dur: 3.6, title: 'Shop it, then restock it', sub: 'Tick items off as you buy, then file the whole shop back into your fridge in one tap.', screen: <ListScreen /> },
  { key: 'meals', dur: 4.6, title: 'Dinner from what you’ve got', sub: 'Stuck for ideas? Get real recipes built around what’s already in your fridge.', screen: <MealsScreen /> },
  { key: 'diet', dur: 4.0, title: 'Cooks for your diet', sub: 'Vegetarian, gluten-free, allergic to nuts? Every meal idea respects it.', screen: <DietScreen /> }
]

export default function Showreel() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), (SLIDES[i].dur || 3.6) * 1000)
    return () => clearTimeout(t)
  }, [i])

  const slide = SLIDES[i]

  return (
    <div className="reel">
      <div className="reel-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            className="reel-slide"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reel-phone">
              <div className="reel-screen">{slide.screen}</div>
            </div>
            <h1 className="reel-title">{slide.title}</h1>
            <p className="reel-sub">{slide.sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="reel-foot">whatsinmyfridge.co.uk</div>
    </div>
  )
}
