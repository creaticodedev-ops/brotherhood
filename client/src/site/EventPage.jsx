import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { liveState } from '../../../shared/eventProgram.js'
import { useReveal } from '../landing/hooks'
import { publicUrl } from '../config/site'
import { EVENT_COPY } from './eventCopy'
import { useCopy, usePageMeta } from './ui'
import './event.css'

const loadProgram = async (slug, preview) => {
  const response = await fetch(preview ? `/api/admin/events/preview/${encodeURIComponent(slug)}` : `/api/events/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
    credentials: preview ? 'same-origin' : 'omit',
  })
  if (response.status === 404) return { missing: true }
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

const when = (start, end) => [start, end].filter(Boolean).join(' – ')

const countdown = (iso, now) => {
  const left = Math.max(0, Date.parse(iso) - now)
  const minutes = Math.floor(left / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours} h ${String(minutes % 60).padStart(2, '0')}`
  return `${minutes} min`
}

const daySpan = (phases) => {
  const clocks = (phases || [])
    .flatMap((phase) => [phase.start, phase.end, ...(phase.activities || []).flatMap((item) => [item.start, item.end])])
    .filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    .sort()
  if (!clocks.length) return ''
  return clocks[0] === clocks[clocks.length - 1] ? clocks[0] : `${clocks[0]} – ${clocks[clocks.length - 1]}`
}

const Mark = ({ index }) => {
  const marks = [
    <path key="a" d="M12 3v18M3 12h18" />,
    <path key="b" d="M12 4l2.2 5.2L20 12l-5.8 2.8L12 20l-2.2-5.2L4 12l5.8-2.8L12 4z" />,
    <path key="c" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
    <path key="d" d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 8v4l3 2" />,
  ]
  return (
    <svg className="event-mark" viewBox="0 0 24 24" aria-hidden="true">
      {marks[index % marks.length]}
    </svg>
  )
}

export const EventPage = ({ slug }) => {
  const { locale } = useCopy()
  const copy = EVENT_COPY[locale] || EVENT_COPY.fr
  const preview = new URLSearchParams(window.location.search).get('preview') === '1'
  const [state, setState] = useState({ status: 'loading' })
  const [open, setOpen] = useState('')
  const [copied, setCopied] = useState(false)
  const [pdfState, setPdfState] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [qr, setQr] = useState('')
  const pageUrl = publicUrl(`/events/${slug}`)
  useReveal(`${locale}:${state.program?.slug || ''}`)

  useEffect(() => {
    let live = true
    loadProgram(slug, preview)
      .then((data) => live && setState({ status: 'ready', program: data.program, serverNow: data.serverNow, publication: data.status || 'published', missing: data.missing }))
      .catch(() => live && setState({ status: 'error' }))
    return () => {
      live = false
    }
  }, [preview, slug])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let live = true
    QRCode.toString(pageUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#141414', light: '#ffffff' } })
      .then((svg) => live && svg.startsWith('<svg') && setQr(svg))
      .catch(() => live && setQr(''))
    return () => {
      live = false
    }
  }, [pageUrl])

  const downloadQr = async () => {
    const dataUrl = await QRCode.toDataURL(pageUrl, { margin: 1, width: 720, errorCorrectionLevel: 'M', color: { dark: '#141414', light: '#ffffff' } })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${slug}-programme.png`
    link.click()
  }

  const program = state.program
  const poster = program?.slug === 'childrens-day'
  usePageMeta(program ? `${poster ? "Children's Day — " : ''}${program.title} — The Brotherhood` : 'The Brotherhood', program?.summary || '', `/events/${slug}`)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: program?.title || 'The Brotherhood', url: pageUrl })
        return
      } catch {
        /* The visitor dismissed the sheet. Copy remains available. */
      }
    }
    await copyLink()
  }

  const downloadPdf = async () => {
    setPdfState('working')
    try {
      const { downloadEventProgram } = await import('./eventProgramPdf.js')
      await downloadEventProgram({ program, url: pageUrl })
      setPdfState('ready')
    } catch {
      setPdfState('error')
    }
  }

  if (state.status === 'loading') {
    return <p className="page-loading event-empty">{copy.loading}</p>
  }
  if (state.status === 'error') {
    return (
      <div className="event-empty">
        <div>
          <h1>{copy.error}</h1>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            {copy.retry}
          </button>
        </div>
      </div>
    )
  }
  if (state.missing || !program) {
    return (
      <div className="event-empty">
        <div>
          <p className="kicker">{copy.kicker}</p>
          <h1>{preview ? copy.soon : copy.missing}</h1>
        </div>
      </div>
    )
  }

  const clockNow = state.serverNow ? Date.parse(state.serverNow) + (now - Date.parse(state.serverNow)) : now
  const corrected = liveState({ ...program, status: 'published' }, new Date(clockNow))
  const hours = daySpan(program.phases)
  const presents = [program.organizer, copy.presents].filter(Boolean).join(' ')

  return (
    <article className="event-page">
      <header className={`event-hero${program.banner ? ' has-poster' : ''}`}>
        {program.banner ? null : (
          <div className="event-hero-stage" aria-hidden="true">
            <span className="event-orbit" />
            <span className="event-orbit event-orbit-inner" />
          </div>
        )}
        <div className="container event-hero-layout">
        <div className="event-hero-copy">
          <p className="event-presents">
            <span />
            {presents}
          </p>
          <h1>
            {poster ? (
              <span className="event-display" dir="ltr">
                <span>Children's</span>
                <span>Day</span>
              </span>
            ) : (
              <span className="event-display event-display-plain">{program.title}</span>
            )}
            {poster ? <span className="event-subtitle">{program.title}</span> : null}
          </h1>
          <div className="event-facts">
            {hours ? (
              <div>
                <small>{copy.hours}</small>
                <strong dir="ltr">{hours}</strong>
              </div>
            ) : null}
            {program.eventDate ? (
              <div>
                <small>{copy.date}</small>
                <strong>{program.eventDate}</strong>
              </div>
            ) : null}
            {program.location ? (
              <div>
                <small>{copy.location}</small>
                <strong>{program.location}</strong>
              </div>
            ) : null}
          </div>
          {program.summary ? <p className="lead">{program.summary}</p> : null}
          <div className="event-actions">
            <button type="button" className="btn btn-primary" onClick={downloadPdf} disabled={pdfState === 'working'}>
              {pdfState === 'working' ? copy.pdfWorking : copy.pdf}
            </button>
            <button type="button" className="btn btn-ghost" onClick={share}>
              {copied ? copy.copied : copy.share}
            </button>
            <button type="button" className="btn btn-ghost" onClick={copyLink}>
              {copy.copy}
            </button>
          </div>
          {pdfState === 'error' ? <p className="event-pdf-error">{copy.pdfError}</p> : null}
          {preview && state.publication !== 'published' ? <p className="event-kicker">{copy.preview}</p> : null}
        </div>
        {program.banner ? (
          <figure className="event-poster">
            <img src={program.banner} alt={program.title} />
          </figure>
        ) : null}
        </div>
      </header>

      <div className="container event-sheet">
        {program.eventDate && (corrected.current || corrected.next) ? (
          <section className="event-live" aria-live="polite">
            <div className={corrected.current ? 'is-live' : ''}>
              <p className="event-kicker">
                {corrected.current ? <i className="event-pulse" aria-hidden="true" /> : null}
                {copy.now}
              </p>
              <h2>{corrected.current?.title || '—'}</h2>
              {corrected.current ? <time dir="ltr">{when(corrected.current.start, corrected.current.end)}</time> : null}
            </div>
            <div>
              <p className="event-kicker">{copy.next}</p>
              <h2>{corrected.next?.title || '—'}</h2>
              {corrected.next ? <time dir="ltr">{when(corrected.next.start, corrected.next.end)}</time> : null}
              {corrected.next?.at ? (
                <p>
                  {copy.until} {countdown(corrected.next.at, clockNow)}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <nav className="event-index" aria-label={copy.contents}>
          {program.phases.map((phase, index) => (
            <a key={phase.key} href={`#phase-${phase.key}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{phase.title}</strong>
              <time dir="ltr">{when(phase.start, phase.end)}</time>
            </a>
          ))}
        </nav>

        {program.publicUpdatedAt ? (
          <p className="event-kicker event-updated">
            {copy.updated} · {new Date(program.publicUpdatedAt).toLocaleString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: program.timeZone })}
          </p>
        ) : null}

        <ol className="event-timeline">
          {program.phases.map((phase, index) => (
            <li key={phase.key} id={`phase-${phase.key}`} className={`event-phase is-${index % 4}`} data-reveal>
              <div className="event-phase-rail">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <time dir="ltr">{when(phase.start, phase.end)}</time>
              </div>
              <div className="event-phase-body">
                <header>
                  <Mark index={index} />
                  <h2>{phase.title}</h2>
                </header>
                <ul className="event-slots">
                  {phase.activities.map((item) => {
                    const expanded = open === item.key
                    const current = corrected.current?.key === item.key
                    return (
                      <li key={item.key} className={`event-activity${current ? ' is-current' : ''}`}>
                        <time dir="ltr">{when(item.start, item.end)}</time>
                        <div>
                          <h3>{item.title}</h3>
                          {item.detail ? (
                            <>
                              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? '' : item.key)}>
                                {expanded ? copy.hide : copy.details}
                              </button>
                              <div className={`event-detail${expanded ? ' is-open' : ''}`}>
                                <p aria-hidden={!expanded}>{item.detail}</p>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <section className={`event-close${program.parentInfo ? ' has-note' : ''}`}>
          {qr ? (
            <div className="event-qr">
              <div className="event-qr-mark" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <p className="event-kicker">{copy.qr}</p>
                <p>{copy.qrLead}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={downloadQr}>
                  {copy.qrDownload}
                </button>
              </div>
            </div>
          ) : null}
          {program.parentInfo ? (
            <div className="event-note">
              <p className="event-kicker">{copy.parents}</p>
              <p>{program.parentInfo}</p>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  )
}
