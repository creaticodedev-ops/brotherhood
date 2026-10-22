import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { DateField } from './DatePicker'
import { formatClock, formatCount, formatDate, formatMoney, fullName } from './format'
import { CheckIcon, ChevronIcon, CloseIcon, SearchIcon, SortIcon, TrashIcon, WhatsAppIcon } from './icons'
import { STATUS_ORDER } from './hooks'
import { Avatar, ErrorState, StatusPill } from './parts'
import { useAdminText } from './strings'
import { WhatsAppMessageModal } from './WhatsAppMessageModal'
import { confirmationMessage, isWhatsAppEligible, isWhatsAppGroupUrl, openWhatsApp } from './whatsapp'

const OFFERS = ['essential', 'advanced', 'premium']
const DURATIONS = ['15d', '1m']
const GENDERS = ['homme', 'femme']
const SQUADS = ['communication', 'design', 'photo', 'events', 'partners']
const PAGE_SIZES = [20, 50, 100]
const SEARCH_DELAY = 250
const SORTS = [
  { id: 'createdAt:desc', key: 'createdAt', order: 'desc', label: 'sortNewest' },
  { id: 'createdAt:asc', key: 'createdAt', order: 'asc', label: 'sortOldest' },
  { id: 'name:asc', key: 'name', order: 'asc', label: 'sortName' },
  { id: 'name:desc', key: 'name', order: 'desc', label: 'sortNameDesc' },
  { id: 'status:asc', key: 'status', order: 'asc', label: 'sortStatus' },
]

const COLUMNS = [
  { key: 'applicant', sort: 'name', col: 'who' },
  { key: 'gender', col: 'gender' },
  { key: 'city', sort: 'city', col: 'city' },
  { key: 'squad', col: 'squad' },
  { key: 'date', sort: 'createdAt', col: 'date' },
  { key: 'status', sort: 'status', col: 'status' },
]

const FLASH_MS = 4500

const ConfirmDelete = ({ item, pending, onCancel, onConfirm }) => {
  const a = useAdminText()
  const ref = useRef(null)
  const name = fullName(item)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="adm-confirm"
      aria-labelledby="adm-confirm-title"
      aria-describedby="adm-confirm-body"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel()
      }}
    >
      <div className="adm-confirm-card">
        <span className="adm-confirm-icon" aria-hidden="true">
          <TrashIcon size={18} />
        </span>
        <h2 id="adm-confirm-title">{a('table.deleteTitle')}</h2>
        <p id="adm-confirm-body">{a('table.deleteBody', { name })}</p>
        <div className="adm-confirm-actions">
          <button type="button" className="btn btn-sm" onClick={onCancel} disabled={pending} autoFocus>
            {a('table.deleteCancel')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={pending}>
            {a('table.deleteConfirm')}
          </button>
        </div>
      </div>
    </dialog>
  )
}

const useDebounced = (value, ms) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export const Applications = ({ version, fresh, onOpen, onChanged, canDelete = false, canSaveWhatsAppLink = false }) => {
  const a = useAdminText()
  const { t, locale } = useI18n()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [offer, setOffer] = useState('')
  const [duration, setDuration] = useState('')
  const [gender, setGender] = useState('')
  const [squad, setSquad] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState({ key: 'createdAt', order: 'desc' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [doomed, setDoomed] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [flash, setFlash] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [waTargets, setWaTargets] = useState(null)
  const [groupLink, setGroupLink] = useState('')
  const q = useDebounced(query.trim(), SEARCH_DELAY)
  const listRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .whatsappDefaults(controller.signal)
      .then((result) => setGroupLink(result.whatsappGroupUrl || ''))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!flash) return undefined
    const id = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(id)
  }, [flash])

  useEffect(() => {
    setPage(1)
  }, [q, status, offer, duration, gender, squad, from, to, sort, limit])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const params = { page, limit, sort: sort.key, order: sort.order }
    if (q) params.q = q
    if (status) params.status = status
    if (offer) params.offer = offer
    if (duration) params.duration = duration
    if (gender) params.gender = gender
    if (squad) params.squad = squad
    if (from) params.from = from
    if (to) params.to = to
    adminApi
      .applications(params, controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
        setLoading(false)
        setSelected(new Set())
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err)
        setLoading(false)
      })
    return () => controller.abort()
  }, [q, status, offer, duration, gender, squad, from, to, sort, page, limit, version, attempt])

  const toggleSort = (key) =>
    setSort((prev) => (prev.key === key ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' } : { key, order: key === 'name' || key === 'city' ? 'asc' : 'desc' }))

  const changeStatus = useCallback(
    async (item, next) => {
      setBusy((prev) => ({ ...prev, [item.id]: next }))
      try {
        const { item: updated } = await adminApi.setStatus(item.id, next)
        setData((prev) => prev && { ...prev, items: prev.items.map((row) => (row.id === updated.id ? updated : row)) })
        if ((next === 'approved' || next === 'accepted') && updated.phone && !openWhatsApp(updated.phone, confirmationMessage(updated))) onOpen(updated.id)
        onChanged()
      } catch {
        setAttempt((n) => n + 1)
      } finally {
        setBusy((prev) => {
          const rest = { ...prev }
          delete rest[item.id]
          return rest
        })
      }
    },
    [onChanged, onOpen],
  )

  const confirmDelete = async () => {
    const item = doomed
    if (!item) return
    setDeleting(true)
    try {
      await adminApi.deleteApplication(item.id)
      setData((prev) => {
        if (!prev) return prev
        const counts = { ...prev.counts }
        if (item.status in counts) counts[item.status] = Math.max(0, counts[item.status] - 1)
        return { ...prev, items: prev.items.filter((row) => row.id !== item.id), total: Math.max(0, prev.total - 1), counts }
      })
      setFlash({ tone: 'ok', text: a('table.deleted', { name: fullName(item) }) })
      onChanged()
    } catch (err) {
      if (err.status === 404) {
        setFlash({ tone: 'ok', text: a('table.deleted', { name: fullName(item) }) })
        onChanged()
      } else {
        setFlash({ tone: 'error', text: a('table.deleteFailed') })
      }
    } finally {
      setDeleting(false)
      setDoomed(null)
    }
  }

  const goTo = (next) => {
    setPage(next)
    listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const counts = data?.counts || {}
  const allCount = STATUS_ORDER.reduce((sum, key) => sum + (counts[key] || 0), 0)
  const filtered = Boolean(q || status || offer || duration || gender || squad || from || to)
  const sortId = `${sort.key}:${sort.order}`
  const eligibleOnPage = (data?.items || []).filter(isWhatsAppEligible)
  const selectedItems = (data?.items || []).filter((item) => selected.has(item.id) && isWhatsAppEligible(item))
  const allEligibleSelected = eligibleOnPage.length > 0 && eligibleOnPage.every((item) => selected.has(item.id))

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllEligible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allEligibleSelected) eligibleOnPage.forEach((item) => next.delete(item.id))
      else eligibleOnPage.forEach((item) => next.add(item.id))
      return next
    })
  }

  const openWhatsAppFor = (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(isWhatsAppEligible)
    if (!list.length) return
    if (!isWhatsAppGroupUrl(groupLink)) {
      setFlash({ tone: 'error', text: a('whatsapp.missingGroupFlash') })
    }
    setWaTargets(list)
  }

  const reset = () => {
    setQuery('')
    setStatus('')
    setOffer('')
    setDuration('')
    setGender('')
    setSquad('')
    setFrom('')
    setTo('')
    setSort({ key: 'createdAt', order: 'desc' })
  }

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{a('table.kicker')}</p>
          <h1 className="adm-title">{a('table.title')}</h1>
          <p className="adm-lead">{a('table.lead')}</p>
        </div>
      </header>

      <div className="adm-toolbar">
        <label className="adm-search">
          <SearchIcon />
          <span className="sr-only">{a('table.search')}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={a('table.search')} dir="auto" />
          {query ? (
            <button type="button" className="adm-search-clear" onClick={() => setQuery('')} aria-label={a('table.clear')}>
              <CloseIcon size={14} />
            </button>
          ) : null}
        </label>
        <div className="adm-selects">
          <select value={sortId} onChange={(event) => {
            const next = SORTS.find((item) => item.id === event.target.value)
            if (next) setSort({ key: next.key, order: next.order })
          }} aria-label={a('table.sort')}>
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {a(`table.${item.label}`)}
              </option>
            ))}
          </select>
          <select value={offer} onChange={(event) => setOffer(event.target.value)} aria-label={a('table.offer')}>
            <option value="">{a('table.allOffers')}</option>
            {OFFERS.map((id) => (
              <option key={id} value={id}>
                {t(`offers.items.${id}.name`)}
              </option>
            ))}
          </select>
          <select value={duration} onChange={(event) => setDuration(event.target.value)} aria-label={a('table.duration')}>
            <option value="">{a('table.allDurations')}</option>
            {DURATIONS.map((id) => (
              <option key={id} value={id}>
                {t(`register.durations.${id}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="adm-filters">
        <label>
          <span>{a('table.gender')}</span>
          <select value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="">{a('table.allGenders')}</option>
            {GENDERS.map((id) => (
              <option key={id} value={id}>
                {a(`genders.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{a('table.squad')}</span>
          <select value={squad} onChange={(event) => setSquad(event.target.value)}>
            <option value="">{a('table.allSquads')}</option>
            {SQUADS.map((id) => (
              <option key={id} value={id}>
                {a(`squads.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{a('table.from')}</span>
          <DateField id="adm-filter-from" value={from} max={to || undefined} onChange={setFrom} />
        </label>
        <label>
          <span>{a('table.to')}</span>
          <DateField id="adm-filter-to" value={to} min={from || undefined} onChange={setTo} />
        </label>
      </div>

      <div className="adm-chips" role="group" aria-label={a('table.statusFilter')}>
        <button type="button" className="adm-chip" aria-pressed={!status} onClick={() => setStatus('')}>
          {a('table.all')}
          <span>{formatCount(allCount, locale)}</span>
        </button>
        {STATUS_ORDER.map((key) => (
          <button key={key} type="button" className="adm-chip" aria-pressed={status === key} onClick={() => setStatus(key)}>
            <i className={`is-${key}`} aria-hidden="true" />
            {a(`statuses.${key}`)}
            <span>{formatCount(counts[key] || 0, locale)}</span>
          </button>
        ))}
        {filtered ? (
          <button type="button" className="adm-link adm-reset" onClick={reset}>
            {a('table.reset')}
          </button>
        ) : null}
      </div>

      {flash ? (
        <p className={`adm-flash is-${flash.tone}`} role={flash.tone === 'error' ? 'alert' : 'status'}>
          {flash.text}
        </p>
      ) : null}

      {selectedItems.length ? (
        <div className="adm-bulk-bar" role="region" aria-label={a('whatsapp.bulkBar')}>
          <p>{a('whatsapp.bulkSelected', { n: formatCount(selectedItems.length, locale) })}</p>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => openWhatsAppFor(selectedItems)}>
            <WhatsAppIcon />
            <span>{a('whatsapp.bulkSend')}</span>
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
            {a('whatsapp.bulkClear')}
          </button>
        </div>
      ) : null}

      <section ref={listRef} className={`adm-panel adm-table-panel${loading && data ? ' is-loading' : ''}`} aria-busy={loading}>
        <span className="adm-progress" aria-hidden="true" />
        {error && !data ? (
          <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : !data ? (
          <div className="adm-table-ghosts" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="adm-ghost is-row" />
            ))}
          </div>
        ) : data.items.length ? (
          <table className="adm-table">
            <caption className="sr-only">
              {a('table.title')} — {a('table.results', { n: formatCount(data.total, locale) })}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="adm-col-check">
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    disabled={!eligibleOnPage.length}
                    onChange={toggleSelectAllEligible}
                    aria-label={a('whatsapp.selectAll')}
                  />
                </th>
                {COLUMNS.map((column) => {
                  const active = column.sort && sort.key === column.sort
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={`adm-col-${column.col}`}
                      aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {column.sort ? (
                        <button type="button" className="adm-th" onClick={() => toggleSort(column.sort)} title={a('table.sortBy', { column: a(`table.${column.key}`) })}>
                          {a(`table.${column.key}`)}
                          <SortIcon direction={active ? sort.order : null} />
                        </button>
                      ) : (
                        a(`table.${column.key}`)
                      )}
                    </th>
                  )
                })}
                <th scope="col" className="adm-col-actions is-actions">
                  <span className="sr-only">{a('table.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  className={`${fresh.has(item.id) ? 'is-fresh' : ''}${busy[item.id] ? ' is-busy' : ''}${selected.has(item.id) ? ' is-selected' : ''}`.trim() || undefined}
                  onClick={() => onOpen(item.id)}
                >
                  <td className="adm-cell-check" onClick={(event) => event.stopPropagation()}>
                    {isWhatsAppEligible(item) ? (
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={a('whatsapp.selectOne', { name: fullName(item) })}
                      />
                    ) : (
                      <span className="adm-check-spacer" aria-hidden="true" />
                    )}
                  </td>
                  <td className="adm-cell-applicant">
                    <Avatar item={item} viewable />
                    <span>
                      <button
                        type="button"
                        className="adm-name"
                        dir="auto"
                        title={fullName(item)}
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpen(item.id)
                        }}
                      >
                        {fullName(item)}
                      </button>
                      <span className="adm-sub" dir="ltr" title={item.email || undefined}>
                        {item.email || a('detail.noEmail')}
                      </span>
                      {item.phone ? (
                        <span className="adm-sub" dir="ltr">
                          {item.phone}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label={a('table.gender')}>{item.gender ? a(`genders.${item.gender}`) : '—'}</td>
                  <td data-label={a('table.city')} dir="auto">
                    {item.city}
                  </td>
                  <td className="adm-cell-squad" data-label={item.kind === 'membership' ? a('table.squad') : a('table.offer')}>
                    {item.kind === 'membership' ? (
                      (item.squads || []).map((id) => a(`squads.${id}`)).join(' · ') || '—'
                    ) : (
                      <span className="adm-stack">
                        <span>{t(`offers.items.${item.offer}.name`)}</span>
                        <span className="adm-sub" dir="ltr">
                          {formatMoney(item.amount, locale, item.currency)} · {t(`register.durations.${item.duration}`)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td data-label={a('table.date')} className="adm-date">
                    <span>{formatDate(item.createdAt, locale)}</span>
                    <span className="adm-sub">{formatClock(item.createdAt, locale)}</span>
                  </td>
                  <td data-label={a('table.status')}>
                    <StatusPill status={item.status} />
                  </td>
                  <td className="is-actions" onClick={(event) => event.stopPropagation()}>
                    {item.status === 'pending' || item.status === 'new' || canDelete || isWhatsAppEligible(item) ? (
                      <span className="adm-quick">
                        {item.status === 'pending' || item.status === 'new' ? (
                          <>
                            <button
                              type="button"
                              className="adm-quick-btn is-approve"
                              disabled={Boolean(busy[item.id])}
                              onClick={() => changeStatus(item, item.kind === 'membership' ? 'accepted' : 'approved')}
                              aria-label={`${a(item.kind === 'membership' ? 'actions.accepted' : 'actions.approved')} — ${fullName(item)}`}
                              title={a(item.kind === 'membership' ? 'actions.accepted' : 'actions.approved')}
                            >
                              <CheckIcon />
                            </button>
                            <button
                              type="button"
                              className="adm-quick-btn is-reject"
                              disabled={Boolean(busy[item.id])}
                              onClick={() => changeStatus(item, 'rejected')}
                              aria-label={`${a('actions.rejected')} — ${fullName(item)}`}
                              title={a('actions.rejected')}
                            >
                              <CloseIcon size={16} />
                            </button>
                          </>
                        ) : null}
                        {isWhatsAppEligible(item) ? (
                          <button
                            type="button"
                            className="btn btn-sm adm-wa-row-btn"
                            onClick={() => openWhatsAppFor(item)}
                            aria-label={`${a('whatsapp.sendAction')} — ${fullName(item)}`}
                            title={a('whatsapp.sendAction')}
                          >
                            <WhatsAppIcon size={16} />
                            <span>{a('whatsapp.sendAction')}</span>
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="adm-quick-btn is-delete"
                            disabled={Boolean(busy[item.id]) || doomed?.id === item.id}
                            onClick={() => setDoomed(item)}
                            aria-label={`${a('table.delete')} — ${fullName(item)}`}
                            title={a('table.delete')}
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                    <button type="button" className="adm-open" onClick={() => onOpen(item.id)} aria-label={`${a('table.open')} — ${fullName(item)}`}>
                      <ChevronIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-empty">{a(filtered ? 'table.empty' : 'table.none')}</p>
        )}

        {data && data.total ? (
          <footer className="adm-pager">
            <span>{a('table.results', { n: formatCount(data.total, locale) })}</span>
            <label className="adm-perpage">
              {a('table.perPage')}
              <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span className="adm-pager-nav">
              <button type="button" className="adm-icon-btn is-sm is-prev" disabled={data.page <= 1} onClick={() => goTo(data.page - 1)} aria-label={a('table.prev')}>
                <ChevronIcon />
              </button>
              <span>{a('table.page', { page: formatCount(data.page, locale), pages: formatCount(data.pages, locale) })}</span>
              <button type="button" className="adm-icon-btn is-sm" disabled={data.page >= data.pages} onClick={() => goTo(data.page + 1)} aria-label={a('table.next')}>
                <ChevronIcon />
              </button>
            </span>
          </footer>
        ) : null}
      </section>

      {doomed ? <ConfirmDelete item={doomed} pending={deleting} onCancel={() => setDoomed(null)} onConfirm={confirmDelete} /> : null}

      {waTargets ? (
        <WhatsAppMessageModal
          items={waTargets}
          initialGroupLink={groupLink}
          canSaveLink={canSaveWhatsAppLink}
          onClose={() => setWaTargets(null)}
          onPrepared={(updated) => {
            setData((prev) => prev && { ...prev, items: prev.items.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)) })
            if (updated?.finalization || updated?.whatsapp) onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
