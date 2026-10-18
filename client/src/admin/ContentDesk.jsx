import { useEffect, useMemo, useState } from 'react'
import { STORIES } from '../../../shared/catalog.js'
import { MEMBERSHIP_LAUNCH } from '../config/site'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { CONTENT_COPY, fill } from './contentCopy'
import { ChevronIcon, SearchIcon } from './icons'
import { ErrorState } from './parts'
import { StoryEditor } from './StoryEditor'

const LIBRARY = [...new Set(STORIES.flatMap((story) => [story.cover, ...story.images.map((image) => image.src)]).filter(Boolean))]
const DEFAULT_LIMITS = { images: 24 }

const move = (list, from, to) => {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const bySort = (a, b) => (a.sort || 0) - (b.sort || 0) || a.title.localeCompare(b.title)

export const ContentDesk = () => {
  const { locale } = useI18n()
  const copy = CONTENT_COPY[locale] || CONTENT_COPY.fr
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [kind, setKind] = useState('mission')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null)
  const [ordering, setOrdering] = useState(null)
  const [dragging, setDragging] = useState(-1)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    adminApi
      .stories()
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch(setError)

  useEffect(() => {
    load()
  }, [])

  const all = useMemo(() => (data?.items || []).filter((item) => item.kind === kind).sort(bySort), [data, kind])
  const counts = useMemo(
    () => ({ mission: (data?.items || []).filter((item) => item.kind === 'mission').length, activity: (data?.items || []).filter((item) => item.kind === 'activity').length }),
    [data],
  )
  const filtered = Boolean(query.trim() || status || category)
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((item) => {
      if (status === 'published' && !item.published) return false
      if (status === 'draft' && item.published) return false
      if (status === 'featured' && !item.featured) return false
      if (category && item.category !== category) return false
      if (needle && ![item.title, item.location, item.summary, item.slug].some((value) => String(value || '').toLowerCase().includes(needle))) return false
      return true
    })
  }, [all, query, status, category])

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <p className="adm-lead">…</p>

  const categories = data.categories || {}
  const limits = data.limits || DEFAULT_LIMITS
  const categoryName = (item) => {
    const found = categories[item.kind]?.find((entry) => entry.id === item.category)
    return found ? found[locale] || found.fr : ''
  }

  if (editing) {
    return (
      <StoryEditor
        key={editing.story?.id || `new-${editing.kind}`}
        copy={copy}
        locale={locale}
        categories={categories}
        limits={limits}
        library={LIBRARY}
        story={editing.story}
        kind={editing.kind}
        onSaved={(item) => {
          setData((current) => ({ ...current, items: [...current.items.filter((row) => row.id !== item.id), item] }))
          setKind(item.kind)
        }}
        onDeleted={(id) => {
          setData((current) => ({ ...current, items: current.items.filter((row) => row.id !== id) }))
          setEditing(null)
        }}
        onClose={() => setEditing(null)}
      />
    )
  }

  const rows = ordering || visible

  const saveOrder = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const { items } = await adminApi.orderStories(kind, ordering.map((item) => item.id))
      setData((current) => ({ ...current, items }))
      setOrdering(null)
      setNotice({ tone: 'ok', text: copy.orderSaved })
    } catch (err) {
      setNotice({ tone: 'error', text: err.status === 409 ? copy.errors.order : err.status === 403 ? copy.errors.forbidden : copy.errors.save })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-view cms">
      <header className="adm-view-head cms-head">
        <div>
          <p className="kicker">{copy.kicker}</p>
          <h1 className="adm-title">{copy.title}</h1>
          <p className="adm-lead">{copy.lead}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ story: null, kind })} disabled={Boolean(ordering)}>
          {copy.newItem[kind]}
        </button>
      </header>

      {MEMBERSHIP_LAUNCH ? <p className="team-rule cms-launch">{copy.launchNote}</p> : null}

      <div className="cms-tabs" role="tablist" aria-label={copy.title}>
        {['mission', 'activity'].map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            className="cms-tab"
            disabled={Boolean(ordering)}
            onClick={() => {
              setKind(value)
              setCategory('')
              setNotice(null)
            }}
          >
            {copy.tabs[value]}
            <span>{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="cms-toolbar">
        <label className="adm-search cms-search">
          <SearchIcon />
          <span className="sr-only">{copy.search}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} disabled={Boolean(ordering)} />
        </label>
        <div className="cms-filters adm-filters">
          <label>
            <span className="sr-only">{copy.filters.all}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={Boolean(ordering)}>
              {['', 'published', 'draft', 'featured'].map((value) => (
                <option key={value || 'all'} value={value}>
                  {value ? copy.filters[value] : copy.filters.all}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{copy.allCategories}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={Boolean(ordering)}>
              <option value="">{copy.allCategories}</option>
              {(categories[kind] || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item[locale] || item.fr}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!ordering ? (
          <button type="button" className="btn btn-sm cms-reorder" onClick={() => setOrdering(all)} disabled={filtered || all.length < 2} title={filtered ? copy.reorderFiltered : undefined}>
            {copy.reorder}
          </button>
        ) : null}
      </div>

      {filtered && !ordering ? <p className="cms-hint">{copy.reorderFiltered}</p> : null}
      {ordering ? (
        <div className="cms-orderbar" role="region" aria-label={copy.reorder}>
          <p>{copy.reorderHint}</p>
          <span>
            <button type="button" className="btn btn-sm" onClick={() => setOrdering(null)} disabled={busy}>
              {copy.confirm.cancel}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={saveOrder} disabled={busy} aria-busy={busy}>
              {busy ? copy.saving : copy.saveOrder}
            </button>
          </span>
        </div>
      ) : null}
      {notice ? (
        <p className={notice.tone === 'ok' ? 'adm-flash is-ok' : 'adm-alert'} role={notice.tone === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      ) : null}

      {rows.length ? (
        <ol className={`cms-list${ordering ? ' is-ordering' : ''}`}>
          {rows.map((item, index) => (
            <li
              key={item.id}
              className={`cms-row${dragging === index ? ' is-dragging' : ''}`}
              draggable={Boolean(ordering)}
              onDragStart={(event) => {
                setDragging(index)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', item.id)
              }}
              onDragOver={(event) => {
                if (!ordering || dragging < 0) return
                event.preventDefault()
                if (dragging !== index) {
                  setOrdering((list) => move(list, dragging, index))
                  setDragging(index)
                }
              }}
              onDragEnd={() => setDragging(-1)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(-1)
              }}
            >
              {ordering ? (
                <span className="cms-row-order">
                  <span className="cms-grip" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="cms-row-index">{index + 1}</span>
                  <button type="button" className="adm-icon-btn is-sm" disabled={index === 0 || busy} onClick={() => setOrdering((list) => move(list, index, index - 1))} aria-label={`${copy.moveUp} — ${item.title}`}>
                    <ChevronIcon className="cms-chevron is-up" />
                  </button>
                  <button type="button" className="adm-icon-btn is-sm" disabled={index === rows.length - 1 || busy} onClick={() => setOrdering((list) => move(list, index, index + 1))} aria-label={`${copy.moveDown} — ${item.title}`}>
                    <ChevronIcon className="cms-chevron is-down" />
                  </button>
                </span>
              ) : null}
              <button type="button" className="cms-row-main" onClick={() => (ordering ? null : setEditing({ story: item, kind: item.kind }))} tabIndex={ordering ? -1 : 0} aria-label={`${copy.edit} — ${item.title}`}>
                <span className="cms-thumb">{item.cover ? <img src={item.cover} alt="" loading="lazy" /> : <span>{copy.noImage}</span>}</span>
                <span className="cms-row-copy">
                  <strong dir="auto">{item.title}</strong>
                  <small dir="auto">{[categoryName(item), item.location, item.year].filter(Boolean).join(' · ') || item.slug}</small>
                </span>
                <span className="cms-row-meta">
                  <span className={`cms-pill ${item.published ? 'is-live' : 'is-draft'}`}>{item.published ? copy.status.published : copy.status.draft}</span>
                  {item.featured ? <span className="cms-pill is-featured">{copy.status.featured}</span> : null}
                  <span className="cms-row-count">{fill(copy.imageCount, { n: item.images.length || (item.cover ? 1 : 0) })}</span>
                </span>
                {!ordering ? <ChevronIcon className="cms-row-go" /> : null}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="adm-empty">{filtered ? copy.empty : copy.none[kind]}</p>
      )}
    </div>
  )
}
