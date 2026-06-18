import { useSyncExternalStore } from 'react'

// First-run "coach" — a sequence of one-at-a-time contextual tips that teach the
// app by *doing*, anchored to the user's own items. Completely separate from the
// slideshow intro (Onboarding.jsx); this is the hands-on layer that follows it.
//
//   scan     → land on Scan, snap real shopping (the USP, learned by doing it)
//   organise → file the new items + tap one to set use-by / essential / long-life
//   used     → mark something used
//   shop     → tick a shopping item off — it files straight into the fridge
//   cook     → ask what you can make
//
// Only ONE step is "current" at a time; each screen shows its tip only when it's
// the current step, so the user is never shown two at once. Progress persists so
// the whole thing runs once and never nags again.

const KEY = 'fridge.coach.v1'
export const STEPS = ['scan', 'organise', 'used', 'shop', 'cook']

let state = load()
const subs = new Set()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw)
      if (v && typeof v.i === 'number') return { i: v.i, done: Boolean(v.done) }
    }
  } catch {
    /* private mode — it just runs in-memory, which is fine */
  }
  return { i: 0, done: false }
}

function commit(next) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode */
  }
  subs.forEach((f) => f())
}

// Current step key, or null once finished/skipped. Stable per state, so it's
// safe as a useSyncExternalStore snapshot.
function currentStep() {
  return state.done ? null : STEPS[state.i] || null
}

export const coach = {
  subscribe(f) {
    subs.add(f)
    return () => subs.delete(f)
  },
  step: currentStep,
  // Advance to the next step (finishing the coach after the last one).
  next() {
    if (state.done) return
    const i = state.i + 1
    commit(i >= STEPS.length ? { i: state.i, done: true } : { i, done: false })
  },
  // Jump forward to a given step (e.g. once items exist, skip past 'scan').
  // Never goes backwards.
  reach(stepKey) {
    if (state.done) return
    const target = STEPS.indexOf(stepKey)
    if (target > state.i) commit({ i: target, done: false })
  },
  // End the whole coach (the "skip the intro" escape on the first scan).
  skip() {
    if (!state.done) commit({ i: state.i, done: true })
  },
  // Testing: ?reset=1 clears this along with the other first-run flags.
  reset() {
    commit({ i: 0, done: false })
  }
}

// Re-render hook: returns the current step key (or null).
export function useCoachStep() {
  return useSyncExternalStore(coach.subscribe, coach.step, coach.step)
}
