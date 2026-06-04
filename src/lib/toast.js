// A tiny global toast: any component can flash a brief message, rendered once
// by <Toast /> near the app root. Used for "Added to your shopping list" etc.

const listeners = new Set()
let current = null
let timer = null

function emit() {
  listeners.forEach((fn) => fn())
}

export const toast = {
  // Show a message for `duration` ms (defaults to ~1.5s — just a beat).
  show(message, duration = 1500) {
    current = { id: Date.now() + Math.random(), message }
    emit()
    clearTimeout(timer)
    timer = setTimeout(() => {
      current = null
      emit()
    }, duration)
  },
  get: () => current,
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
}
