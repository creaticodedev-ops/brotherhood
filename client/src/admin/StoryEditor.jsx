import { useEffect, useMemo, useRef, useState } from 'react'
import { storyPath } from '../../../shared/catalog.js'
import { MEMBERSHIP_LAUNCH } from '../config/site'
import { adminApi } from './api'
import { fill, imageKey } from './contentCopy'
import { ChevronIcon, CloseIcon, ExternalIcon } from './icons'
import { StoryImages } from './StoryImages'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_PARAGRAPHS = 12

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')

const paragraphsOf = (text) =>
  String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

const toForm = (story, kind) => ({
  kind: story?.kind || kind,
  title: story?.title || '',
  slug: story?.slug || '',
  summary: story?.summary || '',
  body: (story?.body || []).join('\n\n'),
  category: story?.category || '',
  location: story?.location || '',
  year: story?.year || '',
  published: Boolean(story?.published),
  featured: Boolean(story?.featured),
  sort: story?.sort,
})

/** Older entries may have a cover that is not in the image list; it becomes image 1 so the cover is always explicit. */
const toImages = (story) => {
  const list = (story?.images || []).map((image) => ({ key: imageKey(), src: image.src, alt: image.alt || '', caption: image.caption || '', status: 'ready' }))
  if (story?.cover && !list.some((image) => image.src === story.cover)) {
    list.unshift({ key: imageKey(), src: story.cover, alt: '', caption: '', status: 'ready' })
  }
  return list
}

const payloadOf = (form, images, id) => {
  const ready = images.filter((image) => image.status === 'ready' && image.src)
  return {
    ...(id ? { id } : {}),
    kind: form.kind,
    slug: form.slug.trim(),
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: paragraphsOf(form.body),
    category: form.category,
    location: form.location.trim(),
    year: form.year.trim(),
    featured: form.featured,
    published: form.published,
    ...(form.sort === undefined ? {} : { sort: form.sort }),
    cover: ready[0]?.src || '',
    images: ready.map(({ src, alt, caption }) => ({ src, alt: alt.trim(), caption: caption.trim() })),
  }
}

export const Confirm = ({ title, body, confirmLabel, cancelLabel, busy, onCancel, onConfirm }) => {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="adm-confirm"
      aria-labelledby="cms-confirm-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <div className="adm-confirm-card">
        <h2 id="cms-confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="adm-confirm-actions">
          <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

const Preview = ({ copy, locale, categories, payload, images, onClose }) => {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])
  const shown = images.filter((image) => image.preview || image.src)
  const cover = shown[0]
  const category = categories?.[payload.kind]?.find((item) => item.id === payload.category)
  return (
    <dialog ref={ref} className="cms-preview" aria-label={copy.preview} onCancel={(event) => (event.preventDefault(), onClose())}>
      <div className="cms-preview-bar">
        <p>{copy.previewNote}</p>
        <button type="button" className="adm-icon-btn is-sm" onClick={onClose} aria-label={copy.images.close}>
          <CloseIcon size={16} />
        </button>
      </div>
      <article className="cms-preview-page">
        <header className="cms-preview-hero">
          {cover ? <img src={cover.preview || cover.src} alt="" /> : null}
          <div>
            <p className="kicker">{copy.kinds[payload.kind]}</p>
            <h1 dir="auto">{payload.title || '—'}</h1>
            <p className="cms-preview-meta">
              {[category?.[locale] || category?.fr, payload.location, payload.year].filter(Boolean).map((part) => (
                <span key={part}>{part}</span>
              ))}
            </p>
            {payload.summary ? <p className="cms-preview-lead" dir="auto">{payload.summary}</p> : null}
          </div>
        </header>
        <div className="cms-preview-body">
          <div dir="auto">
            {payload.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <div className="cms-preview-plates">
            {shown.slice(1).map((image) => (
              <figure key={image.key}>
                <img src={image.preview || image.src} alt={image.alt || ''} />
                {image.caption || image.alt ? <figcaption dir="auto">{image.caption || image.alt}</figcaption> : null}
              </figure>
            ))}
          </div>
        </div>
      </article>
    </dialog>
  )
}

export const StoryEditor = ({ copy, locale, categories, limits, library, story, kind, onSaved, onDeleted, onClose }) => {
  const [id, setId] = useState(story?.id || '')
  const [form, setForm] = useState(() => toForm(story, kind))
  const [images, setImages] = useState(() => toImages(story))
  const [slugTouched, setSlugTouched] = useState(Boolean(story))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [preview, setPreview] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(story?.updatedAt || '')
  const [baseline, setBaseline] = useState(() => JSON.stringify(payloadOf(toForm(story, kind), toImages(story), story?.id)))
  const blobs = useRef(new Set())

  images.forEach((image) => image.preview && blobs.current.add(image.preview))
  useEffect(() => () => blobs.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const payload = useMemo(() => payloadOf(form, images, id), [form, images, id])
  const pending = images.some((image) => image.status === 'preparing' || image.status === 'uploading')
  const failed = images.some((image) => image.status === 'error')
  const dirty = pending || failed || JSON.stringify(payload) !== baseline
  const options = categories?.[form.kind] || []
  const paragraphs = paragraphsOf(form.body).length
  const path = storyPath({ kind: form.kind, slug: form.slug || 'adresse' })

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
    setMessage(null)
  }

  const validate = () => {
    const found = {}
    if (payload.title.length < 2) found.title = copy.errors.title
    if (!SLUG.test(payload.slug)) found.slug = copy.errors.slug
    if (payload.year && !/^\d{4}$/.test(payload.year)) found.year = copy.errors.year
    return found
  }

  const save = async () => {
    if (saving) return
    if (pending) return setMessage({ tone: 'error', text: copy.uploadsPending })
    if (failed) return setMessage({ tone: 'error', text: copy.uploadsFailed })
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return setMessage({ tone: 'error', text: Object.values(found)[0] })
    setSaving(true)
    setMessage(null)
    try {
      const { item } = await adminApi.saveStory(payload)
      const created = !id
      setId(item.id)
      setForm(toForm(item, item.kind))
      const nextImages = toImages(item)
      setImages(nextImages)
      setBaseline(JSON.stringify(payloadOf(toForm(item, item.kind), nextImages, item.id)))
      setSlugTouched(true)
      setUpdatedAt(item.updatedAt || '')
      setMessage({ tone: 'ok', text: created ? copy.created : copy.saved })
      onSaved(item)
    } catch (error) {
      const fields = error.body?.fields || {}
      const mapped = {}
      if (error.status === 409 || fields.slug === 'taken') mapped.slug = copy.errors.slugTaken
      else if (fields.slug) mapped.slug = copy.errors.slug
      if (fields.title) mapped.title = copy.errors.title
      if (fields.year) mapped.year = copy.errors.year
      if (fields.category) mapped.category = copy.errors.category
      if (fields.images || fields.cover) mapped.images = copy.errors.images
      setErrors(mapped)
      setMessage({ tone: 'error', text: Object.values(mapped)[0] || (error.status === 403 ? copy.errors.forbidden : copy.errors.save) })
    } finally {
      setSaving(false)
    }
  }

  const askLeave = () => {
    if (!dirty) return onClose()
    setConfirm({ title: copy.confirm.leaveTitle, body: copy.confirm.leaveBody, label: copy.confirm.leave, run: onClose })
  }

  const askDelete = () =>
    setConfirm({
      title: fill(copy.confirm.deleteTitle, { title: form.title || copy.kinds[form.kind] }),
      body: copy.confirm.deleteBody,
      label: copy.confirm.delete,
      run: async () => {
        setSaving(true)
        try {
          await adminApi.deleteStory(id)
          onDeleted(id)
        } catch (error) {
          setSaving(false)
          setConfirm(null)
          setMessage({ tone: 'error', text: error.status === 403 ? copy.errors.forbidden : copy.errors.save })
        }
      },
    })

  const askRemoveImage = (image) => {
    const drop = () => setImages((list) => list.filter((item) => item.key !== image.key))
    if (image.status !== 'ready') return drop()
    setConfirm({ title: copy.confirm.removeImageTitle, body: copy.confirm.removeImageBody, label: copy.confirm.remove, run: () => (drop(), setConfirm(null)) })
  }

  const field = (key, label, input, { required, hint, wide } = {}) => (
    <label className={`cmd-field${wide ? ' is-wide' : ''}`}>
      <span>
        {label} {required ? <em>{copy.required}</em> : null}
      </span>
      {input}
      {errors[key] ? <small className="cms-field-error">{errors[key]}</small> : hint ? <small className="cms-field-hint">{hint}</small> : null}
    </label>
  )

  return (
    <div className="cms-editor">
      <header className="cms-editor-head">
        <button type="button" className="adm-link cms-back" onClick={askLeave}>
          <ChevronIcon className="cms-chevron is-back" />
          {copy.back}
        </button>
        <div className="cms-editor-title">
          <p className="kicker">{copy.kinds[form.kind]}</p>
          <h1 className="adm-title" dir="auto">{id ? form.title || '—' : copy.create[form.kind]}</h1>
          <p className="cms-editor-pills">
            <span className={`cms-pill ${form.published ? 'is-live' : 'is-draft'}`}>{form.published ? copy.status.published : copy.status.draft}</span>
            {form.featured ? <span className="cms-pill is-featured">{copy.status.featured}</span> : null}
            {dirty ? <span className="cms-unsaved">{copy.unsaved}</span> : null}
          </p>
        </div>
      </header>

      <div className="cms-editor-grid">
        <div className="cms-editor-main">
          <section className="adm-panel cms-section" aria-labelledby="cms-basics">
            <h2 id="cms-basics">{copy.sections.basics}</h2>
            {!id ? (
              <div className="cms-kinds" role="radiogroup" aria-label={copy.kind}>
                {['mission', 'activity'].map((value) => (
                  <label key={value} className={form.kind === value ? 'is-on' : ''}>
                    <input type="radio" name="cms-kind" value={value} checked={form.kind === value} onChange={() => set({ kind: value, category: '' })} />
                    <span>{copy.kinds[value]}</span>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="cms-fields">
              {field(
                'title',
                copy.fields.title,
                <input
                  value={form.title}
                  maxLength={140}
                  dir="auto"
                  aria-invalid={Boolean(errors.title) || undefined}
                  onChange={(event) => set(slugTouched ? { title: event.target.value } : { title: event.target.value, slug: slugify(event.target.value) })}
                />,
                { required: true, wide: true },
              )}
              {field(
                'slug',
                copy.fields.slug,
                <input
                  value={form.slug}
                  maxLength={80}
                  dir="ltr"
                  spellCheck={false}
                  autoCapitalize="none"
                  aria-invalid={Boolean(errors.slug) || undefined}
                  onChange={(event) => {
                    setSlugTouched(true)
                    set({ slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })
                  }}
                />,
                { required: true, wide: true, hint: fill(copy.fields.slugHint, { path }) },
              )}
              {field(
                'category',
                copy.fields.category,
                <select value={form.category} onChange={(event) => set({ category: event.target.value })} aria-invalid={Boolean(errors.category) || undefined}>
                  <option value="">{copy.fields.noCategory}</option>
                  {options.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item[locale] || item.fr}
                    </option>
                  ))}
                </select>,
              )}
              {field('location', copy.fields.location, <input value={form.location} maxLength={120} dir="auto" onChange={(event) => set({ location: event.target.value })} />)}
              {field(
                'year',
                copy.fields.year,
                <input
                  value={form.year}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={copy.fields.yearPlaceholder}
                  aria-invalid={Boolean(errors.year) || undefined}
                  onChange={(event) => set({ year: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                />,
              )}
            </div>
          </section>

          <section className="adm-panel cms-section" aria-labelledby="cms-content">
            <h2 id="cms-content">{copy.sections.content}</h2>
            <div className="cms-fields">
              {field(
                'summary',
                copy.fields.summary,
                <textarea value={form.summary} maxLength={500} rows={3} dir="auto" onChange={(event) => set({ summary: event.target.value })} />,
                { wide: true, hint: `${copy.fields.summaryHint} · ${form.summary.length} / 500` },
              )}
              {field(
                'body',
                copy.fields.body,
                <textarea className="cms-body" value={form.body} rows={10} dir="auto" onChange={(event) => set({ body: event.target.value })} />,
                { wide: true, hint: `${copy.fields.bodyHint} · ${fill(copy.fields.paragraphs, { n: Math.min(paragraphs, MAX_PARAGRAPHS) })}` },
              )}
            </div>
            {paragraphs > MAX_PARAGRAPHS ? <p className="adm-alert">{fill(copy.fields.paragraphs, { n: paragraphs })}</p> : null}
          </section>

          <section className="adm-panel cms-section" aria-labelledby="cms-images">
            <h2 id="cms-images">
              {copy.sections.images} <span className="cms-count">{images.length}</span>
            </h2>
            {errors.images ? <p className="adm-alert" role="alert">{errors.images}</p> : null}
            <StoryImages copy={copy} images={images} setImages={setImages} limit={limits.images} library={library} disabled={saving} onAskRemove={askRemoveImage} />
          </section>
        </div>

        <aside className="cms-editor-side">
          <section className="adm-panel cms-section cms-publish" aria-labelledby="cms-publication">
            <h2 id="cms-publication">{copy.sections.publication}</h2>
            <label className="cms-switch">
              <input type="checkbox" checked={form.published} onChange={(event) => set({ published: event.target.checked })} />
              <span className="cms-switch-track" aria-hidden="true" />
              <span className="cms-switch-copy">
                <strong>{copy.published}</strong>
                <small>{copy.publishedHint}</small>
              </span>
            </label>
            <label className="cms-switch">
              <input type="checkbox" checked={form.featured} onChange={(event) => set({ featured: event.target.checked })} />
              <span className="cms-switch-track" aria-hidden="true" />
              <span className="cms-switch-copy">
                <strong>{copy.featured}</strong>
                <small>{copy.featuredHint}</small>
              </span>
            </label>
            {updatedAt ? <p className="cms-updated">{fill(copy.updated, { date: new Date(updatedAt).toLocaleString(locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) })}</p> : null}
            {message ? (
              <p className={message.tone === 'ok' ? 'adm-flash is-ok' : 'adm-alert'} role={message.tone === 'ok' ? 'status' : 'alert'}>
                {message.text}
              </p>
            ) : null}
            <div className="cms-publish-actions">
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !dirty} aria-busy={saving}>
                {saving ? copy.saving : copy.save}
              </button>
              <button type="button" className="btn" onClick={() => setPreview(true)}>
                {copy.preview}
              </button>
              {id && form.published && !MEMBERSHIP_LAUNCH ? (
                <a className="adm-link" href={storyPath({ kind: form.kind, slug: form.slug })} target="_blank" rel="noopener noreferrer">
                  <ExternalIcon />
                  {copy.view}
                </a>
              ) : null}
            </div>
            {id ? (
              <button type="button" className="adm-link cms-delete" onClick={askDelete} disabled={saving}>
                {copy.remove}
              </button>
            ) : null}
          </section>
        </aside>
      </div>

      <div className="cms-savebar">
        {dirty ? <span>{copy.unsaved}</span> : <span />}
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty}>
          {saving ? copy.saving : copy.save}
        </button>
      </div>

      {preview ? <Preview copy={copy} locale={locale} categories={categories} payload={payload} images={images} onClose={() => setPreview(false)} /> : null}
      {confirm ? (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.label}
          cancelLabel={copy.confirm.cancel}
          busy={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.run}
        />
      ) : null}
    </div>
  )
}
