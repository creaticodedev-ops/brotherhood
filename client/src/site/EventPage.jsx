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

export const EventPage = ({ slug }) => {
  const { locale } = useCopy()
  const copy = EVENT_COPY[locale] || EVENT_COPY.fr
  const preview = new URLSearchParams(window.location.search).get('preview') === '1'
  const [state, setState] = useState({ status: 'loading' })
  const [open, setOpen] = useState('')
  const [copied, setCopied] = useState(false)
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
  usePageMeta(program ? `${program.title} — The Brotherhood` : 'The Brotherhood', program?.summary || '', `/events/${slug}`)

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

  return (
    <article className="event-page">
      <header className="event-hero">
        <div className="event-hero-photo" style={program.banner ? { backgroundImage: `url(${program.banner})` } : undefined} />
        <div className="event-hero-shade" />
        <div className="container event-hero-copy">
          <p className="kicker">{copy.kicker}</p>
          <h1>{program.title}</h1>
          <div className="event-facts">
            {program.organizer ? (
              <div>
                <small>The Brotherhood</small>
                <strong>{program.organizer}</strong>
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
            <button type="button" className="btn btn-primary" onClick={share}>
              {copied ? copy.copied : copy.share}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={copyLink}
            >
              {copy.copy}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              {copy.print}
            </button>
          </div>
          {qr ? (
            <section className="event-qr">
              <div className="event-qr-mark" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <p className="event-kicker">{copy.qr}</p>
                <p>{copy.qrLead}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={downloadQr}>
                  {copy.qrDownload}
                </button>
              </div>
            </section>
          ) : null}
          {preview && state.publication !== 'published' ? <p className="event-kicker">{copy.preview}</p> : null}
        </div>
      </header>

      <div className="container">
        {program.eventDate && (corrected.current || corrected.next) ? (
          <section className="event-live" aria-live="polite">
            <div>
              <p className="event-kicker">{copy.now}</p>
              <h2>{corrected.current?.title || '—'}</h2>
            </div>
            <div>
              <p className="event-kicker">{copy.next}</p>
              <h2>{corrected.next?.title || '—'}</h2>
              {corrected.next?.at ? (
                <p>
                  {copy.until} {countdown(corrected.next.at, clockNow)}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {program.publicUpdatedAt ? (
          <p className="event-kicker" style={{ marginTop: 28 }}>
            {copy.updated} · {new Date(program.publicUpdatedAt).toLocaleString(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: program.timeZone })}
          </p>
        ) : null}

        <ol className="event-timeline">
          {program.phases.map((phase) => (
            <li key={phase.key} className="event-phase" data-reveal>
              <header>
                <h2>{phase.title}</h2>
                <time>{when(phase.start, phase.end)}</time>
              </header>
              <ul className="event-slots">
                {phase.activities.map((item) => (
                  <li key={item.key} className="event-activity">
                    <time>{when(item.start, item.end)}</time>
                    <h3>{item.title}</h3>
                    {item.detail ? (
                      open === item.key ? (
                        <p>{item.detail}</p>
                      ) : (
                        <button type="button" onClick={() => setOpen(item.key)}>
                          {copy.details}
                        </button>
                      )
                    ) : null}
                    {open === item.key && item.detail ? (
                      <button type="button" onClick={() => setOpen('')}>
                        {copy.hide}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {program.parentInfo ? (
          <section className="event-note">
            <p className="event-kicker">{copy.parents}</p>
            <p>{program.parentInfo}</p>
          </section>
        ) : null}
      </div>
    </article>
  )
}
