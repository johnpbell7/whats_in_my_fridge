import { useEffect, useRef } from 'react'

// Accessibility for bottom-sheet dialogs: move focus into the sheet on open,
// trap Tab inside it, close on Escape, and restore focus to whatever opened it
// on close. Pair with role="dialog" aria-modal aria-labelledby + tabIndex={-1}
// on the sheet element, and attach the returned ref to it.
export function useSheet(onClose) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const node = ref.current
    const prevFocus = typeof document !== 'undefined' ? document.activeElement : null

    const focusables = () =>
      node
        ? [...node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
            (el) => !el.disabled && el.getAttribute('aria-hidden') !== 'true'
          )
        : []

    // Focus the first control, or the sheet itself as a fallback.
    ;(focusables()[0] || node)?.focus?.()

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus()
    }
  }, [])

  return ref
}
