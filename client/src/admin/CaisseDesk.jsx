import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { fill } from './contentCopy'
import { DateField } from './DatePicker'
import { formatCount, formatDate, formatMoney, parseAmount } from './format'
import { useScrollHint } from './hooks'
import { CloseIcon, PlusIcon } from './icons'
import { errorKey, useOpsCopy } from './opsCopy'
import { ErrorState, LoadingState } from './parts'

const KINDS = ['income', 'expense', 'transfer', 'reversal']
const METHODS = ['cash', 'transfer', 'card', 'cheque', 'other']
const EMPTY = { kind: 'expense', amount: '', date: '', description: '', category: '', mission: '', method: 'cash', receipt: '' }

const endOfDay = (day) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : '')
const startOfDay = (day) => (day ? new Date(`${day}T00:00:00`).toISOString() : '')
const safeUrl = (value) => (/^https?:\/\/\S+$/i.test(value || '') ? value : '')

const ReverseDialog = ({ t, common, entry, label, onCancel, onDone }) => {
  const ref = useRef(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])
  const submit = async (event) => {
    event.preventDefault()
    if (reason.trim().length < 3) return setProblem(t.reasonShort)
    setBusy(true)
    try {
      await adminApi.reverseEntry(entry.id, reason.trim())
      onDone()
    } catch (error) {
      setProblem(error.status === 409 ? common.errors.server : common.errors[errorKey(error)])
      setBusy(false)
    }
  }
  return (
    <dialog
      ref={ref}
      className="adm-confirm"
      aria-labelledby="reverse-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <form className="adm-confirm-card" onSubmit={submit}>
        <h2 id="reverse-title">{t.reverseTitle}</h2>
        <p dir="auto">{label}</p>
        <label className="cmd-field">
          <span>{t.reverseReason}</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t.reversePlaceholder} maxLength={300} rows={3} autoFocus aria-invalid={Boolean(problem) || undefined} />
        </label>
        {problem ? (
          <p className="adm-alert" role="alert">
            {problem}
          </p>
        ) : null}
        <div className="adm-confirm-actions">
          <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>
            {common.cancel}
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? common.saving : t.reverseConfirm}
          </button>
        </div>
      </form>
    </dialog>
  )
}

const EntryForm = ({ t, common, missions, initialMission, onSaved, onClose }) => {
  const [form, setForm] = useState(() => ({ ...EMPTY, mission: initialMission || '' }))
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const value = parseAmount(form.amount)
    if (!Number.isFinite(value) || value <= 0 || form.description.trim().length < 3) return setProblem(t.form.invalid)
    if (form.kind === 'transfer' && !form.mission) return setProblem(t.form.missionRequired)
    if (form.receipt.trim() && !safeUrl(form.receipt.trim())) return setProblem(t.form.invalidReceipt)
    setProblem('')
    setSaving(true)
    try {
      await adminApi.addEntry({
        ...form,
        amount: value,
        description: form.description.trim(),
        receipt: form.receipt.trim(),
        date: form.date ? new Date(`${form.date}T12:00:00`).toISOString() : new Date().toISOString(),
        mission: form.mission || undefined,
      })
      setForm({ ...EMPTY, mission: initialMission || '' })
      setSaving(false)
      onSaved()
    } catch (error) {
      setProblem(error.status === 422 ? t.form.invalid : common.errors[errorKey(error)])
      setSaving(false)
    }
  }

  return (
    <form className="adm-panel ops-form" onSubmit={submit} noValidate>
      <header className="adm-panel-head">
        <h2>{t.form.title}</h2>
        <button type="button" className="adm-icon-btn is-sm" onClick={onClose} aria-label={common.close}>
          <CloseIcon size={16} />
        </button>
      </header>
      <div className="hq-range is-wrap ops-kinds" role="radiogroup" aria-label={t.form.kind}>
        {['income', 'expense', 'transfer'].map((kind) => (
          <button key={kind} type="button" role="radio" aria-checked={form.kind === kind} onClick={() => setForm((current) => ({ ...current, kind }))}>
            {t.kinds[kind]}
          </button>
        ))}
      </div>
      <div className="ops-fields">
        <label className="cmd-field">
          <span>
            {t.form.amount} <em>{common.required}</em>
          </span>
          <input value={form.amount} onChange={set('amount')} inputMode="decimal" placeholder="0" required />
        </label>
        <div className="cmd-field">
          <span id="entry-date-label">{t.form.date}</span>
          <DateField id="entry-date" labelledBy="entry-date-label" value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
          <small className="ops-hint">{t.form.dateHint}</small>
        </div>
        <label className="cmd-field is-wide">
          <span>
            {t.form.description} <em>{common.required}</em>
          </span>
          <input value={form.description} onChange={set('description')} maxLength={500} required />
        </label>
        <label className="cmd-field">
          <span>{t.form.category}</span>
          <input value={form.category} onChange={set('category')} maxLength={80} />
        </label>
        <label className="cmd-field">
          <span>
            {t.form.mission}
            {form.kind === 'transfer' ? <em> {common.required}</em> : null}
          </span>
          <select value={form.mission} onChange={set('mission')}>
            <option value="">{t.form.noMission}</option>
            {missions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.title}
              </option>
            ))}
          </select>
        </label>
        <label className="cmd-field">
          <span>{t.form.method}</span>
          <select value={form.method} onChange={set('method')}>
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {t.form.methods[method]}
              </option>
            ))}
          </select>
        </label>
        <label className="cmd-field">
          <span>{t.form.receipt}</span>
          <input value={form.receipt} onChange={set('receipt')} inputMode="url" placeholder="https://" maxLength={500} aria-describedby="entry-receipt-hint" />
          <small id="entry-receipt-hint" className="ops-hint">
            {t.form.receiptHint}
          </small>
        </label>
      </div>
      {problem ? (
        <p className="adm-alert" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="ops-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? common.saving : t.form.submit}
        </button>
      </div>
    </form>
  )
}

export const CaisseDesk = ({ intent = null }) => {
  const { locale } = useI18n()
  const copy = useOpsCopy()
  const t = copy.caisse
  const { common } = copy
  const tabsRef = useScrollHint()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [kind, setKind] = useState('')
  const [mission, setMission] = useState(intent?.mission || '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [missions, setMissions] = useState([])
  const [formOpen, setFormOpen] = useState(Boolean(intent?.create))
  const [opening, setOpening] = useState('')
  const [notice, setNotice] = useState(null)
  const [reversing, setReversing] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const params = Object.fromEntries(Object.entries({ kind, mission, from: startOfDay(from), to: endOfDay(to) }).filter(([, value]) => value))
    adminApi
      .ledger(params, controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err)
      })
    return () => controller.abort()
  }, [kind, mission, from, to, version])

  useEffect(() => {
    adminApi
      .missions('')
      .then((result) => setMissions(result.items || []))
      .catch(() => {})
  }, [])

  const missionName = useMemo(() => Object.fromEntries(missions.map((item) => [item.id, item.title])), [missions])
  const reload = () => setVersion((n) => n + 1)
  const say = (tone, text) => setNotice({ tone, text })
  const money = (value) => formatMoney(value || 0, locale, data?.book?.currency || 'MAD')

  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  if (!data) return <LoadingState label={common.loading} rows={5} />

  const { summary, book, period, can } = data
  const filtered = Boolean(kind || mission || from || to)

  const approve = async (entry) => {
    setBusyId(entry.id)
    try {
      await adminApi.approveEntry(entry.id)
      say('ok', t.approvedDone)
      reload()
    } catch (err) {
      say('error', common.errors[errorKey(err)])
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{t.kicker}</p>
          <h1 className="adm-title">{t.title}</h1>
          <p className="adm-lead">{fill(t.formula, { opening: money(summary.opening), income: money(summary.income), expense: money(summary.expense) })}</p>
        </div>
        <div className="ops-head-actions">
          {can.record ? (
            <a className="btn btn-ghost btn-sm" href="/api/admin/ops/ledger.csv" download>
              {t.export}
            </a>
          ) : null}
          {can.record && !formOpen ? (
            <button type="button" className="btn btn-primary btn-sm ops-cta" onClick={() => setFormOpen(true)}>
              <PlusIcon />
              {t.form.title}
            </button>
          ) : null}
        </div>
      </header>

      <div className="adm-kpis">
        <article className="adm-kpi is-accent">
          <span className="adm-kpi-label">{t.balance}</span>
          <span className={`adm-kpi-value${summary.balance < 0 ? ' is-down' : ''}`}>{money(summary.balance)}</span>
        </article>
        <article className="adm-kpi">
          <span className="adm-kpi-label">{t.opening}</span>
          <span className="adm-kpi-value">{money(summary.opening)}</span>
        </article>
        <article className="adm-kpi">
          <span className="adm-kpi-label">{period ? `${t.income} · ${t.period}` : t.income}</span>
          <span className="adm-kpi-value is-up">{money(period ? period.income : summary.income)}</span>
        </article>
        <article className="adm-kpi">
          <span className="adm-kpi-label">{period ? `${t.expense} · ${t.period}` : t.expense}</span>
          <span className="adm-kpi-value is-down">{money(period ? period.expense : summary.expense)}</span>
        </article>
      </div>

      {notice ? (
        <p className={notice.tone === 'ok' ? 'adm-flash' : 'adm-alert'} role={notice.tone === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      ) : null}

      {formOpen && can.record ? (
        <EntryForm
          t={t}
          common={common}
          missions={missions}
          initialMission={mission}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            say('ok', t.form.saved)
            reload()
          }}
        />
      ) : null}

      {can.approve && !book.locked ? (
        <form
          className="adm-panel ops-form ops-opening"
          onSubmit={async (event) => {
            event.preventDefault()
            const value = parseAmount(opening)
            if (!Number.isFinite(value) || value < 0) return say('error', copy.missions.form.invalidAmount)
            try {
              await adminApi.setOpening(value)
              setOpening('')
              say('ok', t.openingForm.saved)
              reload()
            } catch (err) {
              say('error', err.status === 409 ? t.openingForm.locked : common.errors[errorKey(err)])
            }
          }}
        >
          <div>
            <h2 className="ops-label">{t.openingForm.title}</h2>
            <p className="adm-muted">{t.openingForm.text}</p>
          </div>
          <label className="cmd-field">
            <span>{t.opening} (MAD)</span>
            <input inputMode="decimal" placeholder="0" value={opening} onChange={(event) => setOpening(event.target.value)} />
          </label>
          <button className="btn btn-ghost btn-sm" type="submit" disabled={!String(opening).trim()}>
            {t.openingForm.submit}
          </button>
        </form>
      ) : null}

      <div className="ops-toolbar">
        <div className="hq-range is-tabs" ref={tabsRef} role="tablist" aria-label={t.filters.kind}>
          <button type="button" role="tab" aria-selected={!kind} onClick={() => setKind('')}>
            {t.filters.all}
          </button>
          {KINDS.map((key) => (
            <button key={key} type="button" role="tab" aria-selected={kind === key} onClick={() => setKind(key)}>
              {t.kinds[key]}
            </button>
          ))}
        </div>
        <div className="ops-filters">
          <label className="cmd-field">
            <span>{t.filters.mission}</span>
            <select value={mission} onChange={(event) => setMission(event.target.value)}>
              <option value="">{t.filters.allMissions}</option>
              {missions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="cmd-field">
            <span id="ledger-from-label">{common.from}</span>
            <DateField id="ledger-from" labelledBy="ledger-from-label" value={from} onChange={setFrom} />
          </div>
          <div className="cmd-field">
            <span id="ledger-to-label">{common.to}</span>
            <DateField id="ledger-to" labelledBy="ledger-to-label" value={to} onChange={setTo} />
          </div>
          {filtered ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setKind('')
                setMission('')
                setFrom('')
                setTo('')
              }}
            >
              {common.reset}
            </button>
          ) : null}
        </div>
      </div>

      <p className="ops-count" aria-live="polite">
        {fill(t.count, { n: formatCount(data.items.length, locale) })}
      </p>
      {data.truncated ? <p className="ops-note-banner">{t.truncated}</p> : null}

      {data.items.length ? (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th scope="col">{t.table.date}</th>
                <th scope="col">{t.table.kind}</th>
                <th scope="col">{t.table.detail}</th>
                <th scope="col" className="is-num">
                  {t.table.amount}
                </th>
                <th scope="col">{t.table.status}</th>
                {can.approve ? <th scope="col">{t.table.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => {
                const sign = entry.kind === 'income' || (entry.kind === 'reversal' && entry.direction === 'in') ? 'in' : entry.kind === 'transfer' ? 'neutral' : 'out'
                const receipt = safeUrl(entry.receipt)
                const actionable = can.approve && entry.status === 'posted' && entry.kind !== 'reversal'
                return (
                  <tr key={entry.id} className={entry.status === 'reversed' ? 'is-reversed' : ''}>
                    <td data-label={t.table.date}>{formatDate(entry.date, locale)}</td>
                    <td data-label={t.table.kind}>
                      <span className={`hq-tag is-${entry.kind}`}>{t.kinds[entry.kind] || entry.kind}</span>
                    </td>
                    <td data-label={t.table.detail} className="ops-detail-cell">
                      <strong dir="auto">{entry.description}</strong>
                      <small dir="auto">
                        {[entry.mission ? missionName[entry.mission] : '', entry.category, t.form.methods[entry.method] || entry.method, entry.actor ? fill(t.by, { name: entry.actor }) : ''].filter(Boolean).join(' · ')}
                      </small>
                      {receipt ? (
                        <a href={receipt} target="_blank" rel="noopener noreferrer" className="adm-link">
                          {t.receipt}
                        </a>
                      ) : null}
                    </td>
                    <td data-label={t.table.amount} className={`is-num is-${sign}`}>
                      {sign === 'in' ? '+' : sign === 'out' ? '−' : ''}
                      {money(entry.amount)}
                    </td>
                    <td data-label={t.table.status}>
                      {entry.status === 'reversed' ? (
                        <span className="hq-tag is-late">{t.statuses.reversed}</span>
                      ) : entry.approvedAt ? (
                        <span className="hq-tag is-completed">{t.approved}</span>
                      ) : entry.kind === 'reversal' ? (
                        <span className="hq-tag">{t.statuses.posted}</span>
                      ) : (
                        <span className="hq-tag is-upcoming">{t.toApprove}</span>
                      )}
                    </td>
                    {can.approve ? (
                      <td data-label={t.table.actions} className="ops-actions-cell">
                        {actionable ? (
                          <span className="ops-row-actions">
                            {!entry.approvedAt ? (
                              <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === entry.id} onClick={() => approve(entry)}>
                                {t.approve}
                              </button>
                            ) : null}
                            <button type="button" className="btn btn-sm ops-danger" onClick={() => setReversing(entry)}>
                              {t.reverse}
                            </button>
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-empty">{filtered ? t.empty : t.none}</p>
      )}

      {reversing ? (
        <ReverseDialog
          t={t}
          common={common}
          entry={reversing}
          label={fill(t.reverseBody, { kind: t.kinds[reversing.kind], amount: money(reversing.amount), description: reversing.description })}
          onCancel={() => setReversing(null)}
          onDone={() => {
            setReversing(null)
            say('ok', t.reversed)
            reload()
          }}
        />
      ) : null}
    </div>
  )
}
