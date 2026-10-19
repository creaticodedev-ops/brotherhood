import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon, PortraitIcon, ZoomInIcon, ZoomOutIcon } from './icons'
import { useAdminText } from './strings'

const LEVELS = [1, 1.5, 2, 3, 4]
const FOCUSABLE = 'button:not([disabled]), [tabindex="0"]'

/**
 * Full-size view of a stored photo above everything else, including the application drawer.
 * Keys are read in the capture phase so Escape and Tab never reach the dialog underneath.
 */
export const PhotoViewer = ({ src, name, onClose }) => {
  const a = useAdminText()
  const titleId = useId()
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const zoomRef = useRef(null)
  const anchor = useRef(null)
  const drag = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('loading')
  const [natural, setNatural] = useState(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [level, setLevel] = useState(0)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key === 'Tab') {
        event.stopPropagation()
        const items = [...(rootRef.current?.querySelectorAll(FOCUSABLE) || [])]
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (!rootRef.current.contains(document.activeElement)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const step = event.key === '+' || event.key === '=' ? 1 : event.key === '-' || event.key === '_' ? -1 : event.key === '0' ? 'fit' : null
      if (step !== null && zoomRef.current) {
        event.preventDefault()
        event.stopPropagation()
        zoomRef.current(step)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      html.style.overflow = overflow
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = stageRef.current
    const point = anchor.current
    if (!el || !point) return
    anchor.current = null
    el.scrollLeft = point.rx * el.scrollWidth - point.px
    el.scrollTop = point.ry * el.scrollHeight - point.py
  }, [level])

  const ready = status === 'ready' && natural
  const fit = ready && box.w && box.h ? Math.min(1, box.w / natural.w, box.h / natural.h) : 1
  const scale = fit * LEVELS[level]
  const percent = Math.round(scale * 100)

  const zoomTo = (next, point) => {
    const index = Math.max(0, Math.min(LEVELS.length - 1, next))
    const el = stageRef.current
    if (!ready || !el || index === level) return
    const rect = el.getBoundingClientRect()
    const px = point ? point.x - rect.left : el.clientWidth / 2
    const py = point ? point.y - rect.top : el.clientHeight / 2
    anchor.current = { rx: (el.scrollLeft + px) / el.scrollWidth, ry: (el.scrollTop + py) / el.scrollHeight, px, py }
    setLevel(index)
  }

  useEffect(() => {
    zoomRef.current = (step) => zoomTo(step === 'fit' ? 0 : level + step)
  })

  const retry = () => {
    setStatus('loading')
    setNatural(null)
    setLevel(0)
    setAttempt((n) => n + 1)
  }

  const onPointerDown = (event) => {
    const el = stageRef.current
    if (event.pointerType !== 'mouse' || event.button !== 0 || level === 0 || !el) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false, active: true }
    try {
      el.setPointerCapture(event.pointerId)
    } catch {
      // Capture only keeps the drag alive outside the stage; panning works without it.
    }
  }

  const onPointerMove = (event) => {
    const el = stageRef.current
    const start = drag.current
    if (!start?.active || !el || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true
    el.scrollLeft = start.left - dx
    el.scrollTop = start.top - dy
  }

  const onPointerUp = (event) => {
    if (drag.current) drag.current.active = false
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId)
  }

  const onBackdrop = (event) => {
    event.stopPropagation()
    const dragged = drag.current?.moved
    drag.current = null
    if (dragged) return
    if (event.target === event.currentTarget || event.target === stageRef.current || event.target.dataset?.backdrop !== undefined) onClose()
  }

  const url = attempt ? `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}` : src

  return createPortal(
    <div ref={rootRef} className="adm-photo" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onBackdrop}>
      <header className="adm-photo-bar">
        <div className="adm-photo-id">
          <p className="kicker">{a('photo.kicker')}</p>
          <h2 id={titleId} dir="auto">
            {name}
          </h2>
        </div>
        <div className="adm-photo-tools">
          <button type="button" className="adm-icon-btn" onClick={() => zoomTo(level - 1)} disabled={!ready || level === 0} aria-label={a('photo.zoomOut')} title={a('photo.zoomOut')}>
            <ZoomOutIcon />
          </button>
          <button type="button" className="adm-photo-level" onClick={() => zoomTo(0)} disabled={!ready || level === 0} aria-label={`${a('photo.fit')} · ${a('photo.level', { n: percent })}`} title={a('photo.fit')}>
            {ready ? `${percent}%` : '—'}
          </button>
          <button type="button" className="adm-icon-btn" onClick={() => zoomTo(level + 1)} disabled={!ready || level === LEVELS.length - 1} aria-label={a('photo.zoomIn')} title={a('photo.zoomIn')}>
            <ZoomInIcon />
          </button>
          <button ref={closeRef} type="button" className="adm-icon-btn adm-photo-close" onClick={onClose} aria-label={a('photo.close')} title={a('photo.close')}>
            <CloseIcon />
          </button>
        </div>
      </header>

      <div
        ref={stageRef}
        className={`adm-photo-stage${level ? ' is-zoomed' : ''}`}
        dir="ltr"
        tabIndex={ready && level ? 0 : -1}
        aria-label={ready && level ? a('photo.alt', { name }) : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {status === 'error' ? (
          <div className="adm-photo-state" role="alert">
            <span className="adm-photo-placeholder" aria-hidden="true">
              <PortraitIcon size={40} />
            </span>
            <strong>{a('photo.error')}</strong>
            <p>{a('photo.errorHint')}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
              {a('photo.retry')}
            </button>
          </div>
        ) : (
          <>
            {status === 'loading' ? (
              <div className="adm-photo-state" role="status">
                <span className="adm-spinner" aria-hidden="true" />
                <p>{a('photo.loading')}</p>
              </div>
            ) : null}
            <img
              key={attempt}
              src={url}
              alt={a('photo.alt', { name })}
              className={ready ? 'is-ready' : 'is-loading'}
              draggable={false}
              decoding="async"
              style={ready ? { width: Math.floor(natural.w * scale), height: Math.floor(natural.h * scale) } : undefined}
              onLoad={(event) => {
                const { naturalWidth: w, naturalHeight: h } = event.currentTarget
                if (!w || !h) return setStatus('error')
                setNatural({ w, h })
                setStatus('ready')
              }}
              onError={() => setStatus('error')}
              onDoubleClick={(event) => zoomTo(level ? 0 : 2, { x: event.clientX, y: event.clientY })}
            />
          </>
        )}
      </div>

      <p className="adm-photo-hint" data-backdrop="">
        {ready ? (
          <>
            <span className="is-pointer">{a('photo.hintPointer')}</span>
            <span className="is-touch">{a('photo.hintTouch')}</span>
          </>
        ) : null}
        <span className="sr-only" role="status">
          {ready ? a('photo.level', { n: percent }) : ''}
        </span>
      </p>
    </div>,
    document.body,
  )
}
