import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../hooks'

const EXIT_MS = 320

/**
 * Native modal <dialog> (focus trap, Esc, inert page) with enter/exit motion.
 * `children` receives the `close` function so inner views can dismiss the dialog.
 */
export const Dialog = ({ variant, labelledBy, onClosed, children }) => {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    window.setTimeout(
      () => {
        ref.current?.close()
        onClosed()
      },
      prefersReducedMotion() ? 0 : EXIT_MS,
    )
  }, [onClosed])

  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    if (dialog && !dialog.open) dialog.showModal()
    document.documentElement.classList.add('has-dialog')
    return () => {
      document.documentElement.classList.remove('has-dialog')
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true })
    }
  }, [])

  const onCancel = (event) => {
    event.preventDefault()
    close()
  }

  const onPointerDown = (event) => {
    if (event.target === ref.current) close()
  }

  return (
    <dialog
      ref={ref}
      className={`overlay overlay-${variant}${closing ? ' is-closing' : ''}`}
      aria-labelledby={labelledBy}
      onCancel={onCancel}
      onPointerDown={onPointerDown}
    >
      <div className="overlay-panel">{children(close)}</div>
    </dialog>
  )
}

export default Dialog
