import { useRef, useState } from 'react'
import { adminApi } from './api'
import { fill, imageKey } from './contentCopy'
import { CheckIcon, ChevronIcon, CloseIcon } from './icons'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_INPUT = 15 * 1024 * 1024
const KEEP_BYTES = 3_500_000
const KEEP_EDGE = 2560
const TARGET_EDGE = 2400

const decode = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall back to an <img> element */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('read'))
    }
    image.src = url
  })
}

/** Keeps the original file when it is already a sensible size; otherwise scales it to 2400 px on the long edge. */
const prepare = async (file) => {
  if (!TYPES.includes(file.type)) throw new Error('type')
  if (file.size > MAX_INPUT) throw new Error('size')
  const picture = await decode(file).catch(() => {
    throw new Error('read')
  })
  const width = picture.width
  const height = picture.height
  if (!width || !height) throw new Error('read')
  if (file.size <= KEEP_BYTES && Math.max(width, height) <= KEEP_EDGE) return file
  const scale = Math.min(1, TARGET_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(picture, 0, 0, canvas.width, canvas.height)
  const encode = (quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  let blob = await encode(0.9)
  if (blob && blob.size > 4_300_000) blob = await encode(0.82)
  if (!blob || blob.size > 4_400_000) throw new Error('size')
  return blob
}

const uploadError = (error) => {
  if (['type', 'size', 'read'].includes(error?.message)) return error.message
  if (error?.status === 413) return 'size'
  if (error?.status === 415) return 'type'
  if (error?.status === 401 || error?.status === 403) return 'forbidden'
  if (error?.status === 0) return 'network'
  return 'server'
}

const RETRYABLE = new Set(['network', 'server'])

const move = (list, from, to) => {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export const StoryImages = ({ copy, images, setImages, limit, library, disabled, onAskRemove }) => {
  const t = copy.images
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [dragging, setDragging] = useState(-1)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [picked, setPicked] = useState([])
  const [notice, setNotice] = useState('')
  const room = Math.max(0, limit - images.length)

  const patch = (key, change) => setImages((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)))

  const upload = async (item, file) => {
    patch(item.key, { status: 'preparing', progress: 0, error: '' })
    try {
      const blob = await prepare(file)
      patch(item.key, { status: 'uploading', progress: 0 })
      const saved = await adminApi.uploadStoryImage(blob, (progress) => patch(item.key, { progress }))
      patch(item.key, { status: 'ready', src: saved.src, progress: 1, file: null })
    } catch (error) {
      patch(item.key, { status: 'error', error: uploadError(error) })
    }
  }

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setNotice(files.length > room ? fill(t.limit, { n: limit }) : '')
    const accepted = files.slice(0, room).map((file) => ({
      key: imageKey(),
      src: '',
      alt: '',
      caption: '',
      status: 'preparing',
      progress: 0,
      preview: URL.createObjectURL(file),
      file,
    }))
    if (!accepted.length) return
    setImages((list) => [...list, ...accepted])
    accepted.forEach((item) => upload(item, item.file))
  }

  const addLibrary = () => {
    const fresh = picked.filter((src) => !images.some((image) => image.src === src)).slice(0, room)
    setImages((list) => [...list, ...fresh.map((src) => ({ key: imageKey(), src, alt: '', caption: '', status: 'ready' }))])
    setPicked([])
    setLibraryOpen(false)
  }

  const reorder = (from, to) => setImages((list) => move(list, from, to))

  return (
    <div className="cms-images">
      <p className="cms-hint">{t.coverHint}</p>

      <div
        className={`cms-drop${dragOver ? ' is-over' : ''}${disabled || !room ? ' is-disabled' : ''}`}
        onDragOver={(event) => {
          if (dragging >= 0 || disabled || !room) return
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (dragging >= 0) return
          event.preventDefault()
          setDragOver(false)
          if (!disabled) addFiles(event.dataTransfer.files)
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>
          <strong>{t.drop}</strong> <span>{t.or}</span>
        </p>
        <div className="cms-drop-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={disabled || !room} onClick={() => inputRef.current?.click()}>
            {t.choose}
          </button>
          <button type="button" className="btn btn-sm" disabled={disabled || !room} onClick={() => setLibraryOpen((value) => !value)} aria-expanded={libraryOpen}>
            {t.library}
          </button>
        </div>
        <small>{fill(t.rules, { n: limit })}</small>
        <input
          ref={inputRef}
          type="file"
          accept={TYPES.join(',')}
          multiple
          hidden
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>
      {notice ? <p className="adm-alert" role="alert">{notice}</p> : null}

      {libraryOpen ? (
        <div className="cms-library">
          <div className="cms-library-head">
            <p>{t.libraryHint}</p>
            <button type="button" className="adm-icon-btn is-sm" onClick={() => setLibraryOpen(false)} aria-label={t.close}>
              <CloseIcon size={16} />
            </button>
          </div>
          <ul>
            {library.map((src) => {
              const used = images.some((image) => image.src === src)
              const on = picked.includes(src)
              return (
                <li key={src}>
                  <button
                    type="button"
                    className={`cms-library-item${on ? ' is-on' : ''}`}
                    disabled={used}
                    aria-pressed={on}
                    onClick={() => setPicked((list) => (on ? list.filter((item) => item !== src) : [...list, src]))}
                  >
                    <img src={src} alt="" loading="lazy" />
                    {used || on ? (
                      <span>
                        <CheckIcon size={14} />
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="cms-library-foot">
            <button type="button" className="btn btn-primary btn-sm" disabled={!picked.length} onClick={addLibrary}>
              {t.add} {picked.length ? `(${picked.length})` : ''}
            </button>
          </div>
        </div>
      ) : null}

      {images.length ? (
        <ol className="cms-gallery">
          {images.map((image, index) => {
            const busy = image.status === 'preparing' || image.status === 'uploading'
            return (
              <li
                key={image.key}
                className={`cms-tile${index === 0 ? ' is-cover' : ''}${dragging === index ? ' is-dragging' : ''}${image.status === 'error' ? ' is-error' : ''}`}
                draggable={!disabled}
                onDragStart={(event) => {
                  setDragging(index)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', String(index))
                }}
                onDragOver={(event) => {
                  if (dragging < 0) return
                  event.preventDefault()
                  if (dragging !== index) {
                    reorder(dragging, index)
                    setDragging(index)
                  }
                }}
                onDragEnd={() => setDragging(-1)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(-1)
                }}
              >
                <figure>
                  <img src={image.preview || image.src} alt={image.alt || ''} draggable="false" />
                  <span className="cms-tile-index" aria-label={fill(t.position, { n: index + 1, total: images.length })}>
                    {index + 1}
                  </span>
                  {index === 0 ? <span className="cms-tile-cover">{t.cover}</span> : null}
                  {busy ? (
                    <span className="cms-tile-progress" role="status">
                      <span style={{ '--p': `${Math.round((image.progress || 0) * 100)}%` }} />
                      <small>{image.status === 'preparing' ? t.preparing : fill(t.uploading, { p: Math.round((image.progress || 0) * 100) })}</small>
                    </span>
                  ) : null}
                  {image.status === 'error' ? (
                    <span className="cms-tile-error" role="alert">
                      <strong>{t.failed}</strong>
                      <small>{t.errors[image.error] || t.errors.server}</small>
                      {image.file && RETRYABLE.has(image.error) ? (
                        <button type="button" className="btn btn-sm" onClick={() => upload(image, image.file)}>
                          {t.retry}
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </figure>
                <div className="cms-tile-tools">
                  <button type="button" className="adm-icon-btn is-sm" disabled={disabled || index === 0} onClick={() => reorder(index, index - 1)} aria-label={`${t.moveBefore} — ${index + 1}`} title={t.moveBefore}>
                    <ChevronIcon className="cms-chevron is-back" />
                  </button>
                  <button type="button" className="adm-icon-btn is-sm" disabled={disabled || index === images.length - 1} onClick={() => reorder(index, index + 1)} aria-label={`${t.moveAfter} — ${index + 1}`} title={t.moveAfter}>
                    <ChevronIcon className="cms-chevron" />
                  </button>
                  {index > 0 ? (
                    <button type="button" className="cms-tile-make" disabled={disabled || busy || image.status === 'error'} onClick={() => reorder(index, 0)}>
                      {t.makeCover}
                    </button>
                  ) : (
                    <span className="cms-tile-make is-static">{t.cover}</span>
                  )}
                  <button type="button" className="adm-icon-btn is-sm cms-tile-remove" disabled={disabled} onClick={() => onAskRemove(image)} aria-label={`${t.remove} — ${index + 1}`} title={t.remove}>
                    <CloseIcon size={14} />
                  </button>
                </div>
                <details className="cms-tile-text">
                  <summary>{t.details}</summary>
                  <label className="cmd-field">
                    <span>{t.alt}</span>
                    <input value={image.alt} maxLength={240} disabled={disabled} onChange={(event) => patch(image.key, { alt: event.target.value })} />
                  </label>
                  <label className="cmd-field">
                    <span>{t.caption}</span>
                    <input value={image.caption} maxLength={400} disabled={disabled} onChange={(event) => patch(image.key, { caption: event.target.value })} />
                  </label>
                </details>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="cms-empty-images">{t.empty}</p>
      )}
    </div>
  )
}
