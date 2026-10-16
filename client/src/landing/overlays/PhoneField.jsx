import { useEffect, useMemo, useRef, useState } from 'react'
import { countryList, dialCode, examplePhone, matchesCountry, PREFERRED_COUNTRIES } from './phone'

const PAGE = 8

let flagsRequest = null
const loadFlags = () => (flagsRequest ||= import('./flags').then((module) => module.FLAGS))

const Flag = ({ code, flags }) =>
  flags?.[code] ? (
    <img className="phone-flag" src={flags[code]} alt="" width="20" height="14" decoding="async" draggable="false" />
  ) : (
    <span className="phone-flag is-blank" aria-hidden="true" />
  )

/** International phone input: searchable country selector (flag + dialing code) and the national number. */
export const PhoneField = ({ id, label, locale, t, country, value, onCountry, onChange, onBlur, error, errorText }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [flags, setFlags] = useState(null)
  const root = useRef(null)
  const toggle = useRef(null)
  const input = useRef(null)
  const search = useRef(null)
  const menu = useRef(null)
  const list = useRef(null)
  const listId = `${id}-countries`

  useEffect(() => {
    let alive = true
    loadFlags()
      .then((loaded) => alive && setFlags(loaded))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const all = useMemo(() => countryList(locale), [locale])
  const options = useMemo(() => {
    if (query.trim()) return all.filter((item) => matchesCountry(item, query)).map((item) => ({ ...item, key: item.code }))
    const preferred = PREFERRED_COUNTRIES.map((code) => all.find((item) => item.code === code))
      .filter(Boolean)
      .map((item) => ({ ...item, key: `top-${item.code}`, top: true }))
    return [...preferred, ...all.map((item) => ({ ...item, key: item.code }))]
  }, [all, query])

  const current = all.find((item) => item.code === country)
  const dial = dialCode(country)

  useEffect(() => {
    if (!open) return undefined
    search.current?.focus({ preventScroll: true })
    menu.current?.scrollIntoView({ block: 'nearest' })
    const onPointerDown = (event) => {
      if (!root.current?.contains(event.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, options])

  const openMenu = () => {
    const preferred = PREFERRED_COUNTRIES.indexOf(country)
    setActive(preferred >= 0 ? preferred : PREFERRED_COUNTRIES.length + all.findIndex((item) => item.code === country))
    setQuery('')
    setOpen(true)
  }

  const close = (focus = toggle) => {
    setOpen(false)
    setQuery('')
    focus?.current?.focus()
  }

  const select = (code) => {
    onCountry(code)
    close(input)
  }

  const onToggleKey = (event) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
      event.preventDefault()
      openMenu()
    }
  }

  const onSearchKey = (event) => {
    const last = options.length - 1
    const move = { ArrowDown: 1, ArrowUp: -1, PageDown: PAGE, PageUp: -PAGE }[event.key]
    if (move) {
      event.preventDefault()
      setActive((index) => Math.min(last, Math.max(0, index + move)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (options[active]) select(options[active].code)
    } else if (event.key === 'Escape') {
      // Keeps the registration dialog open: Escape only closes the list.
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      close(null)
    }
  }

  return (
    <div className={`field phone-field${error ? ' has-error' : ''}${open ? ' is-open' : ''}`} ref={root}>
      <label htmlFor={id}>{label}</label>
      <div className="phone-wrap">
        <div className="field-control phone-control" dir="ltr">
          <button
            type="button"
            ref={toggle}
            className="phone-country"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-label={t('register.country', { country: current?.name || country, code: dial })}
            onClick={() => (open ? close() : openMenu())}
            onKeyDown={onToggleKey}
          >
            <Flag code={country} flags={flags} />
            <span className="phone-dial">{dial}</span>
            <svg className="phone-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input
            ref={input}
            id={id}
            name={id}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder={examplePhone(country)}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            maxLength={24}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>

        {open ? (
          <div className="phone-menu" ref={menu}>
            <div className="phone-search">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M15.5 15.5l-3.9-3.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                ref={search}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={options[active] ? `${listId}-${options[active].key}` : undefined}
                aria-label={t('register.countrySearch')}
                placeholder={t('register.countrySearch')}
                autoComplete="off"
                spellCheck="false"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                onKeyDown={onSearchKey}
              />
            </div>
            <ul className="phone-list" id={listId} role="listbox" aria-label={t('register.countryList')} ref={list}>
              {options.map((item, index) => (
                <li
                  key={item.key}
                  id={`${listId}-${item.key}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  className={[
                    index === active ? 'is-active' : '',
                    item.code === country ? 'is-current' : '',
                    item.top && !options[index + 1]?.top ? 'is-last-top' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onPointerMove={() => index !== active && setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(item.code)}
                >
                  <Flag code={item.code} flags={flags} />
                  <span className="phone-name">{item.name}</span>
                  <span className="phone-code" dir="ltr">
                    {item.dial}
                  </span>
                </li>
              ))}
            </ul>
            {options.length ? null : (
              <p className="phone-empty" role="status">
                {t('register.countryEmpty')}
              </p>
            )}
          </div>
        ) : null}
      </div>
      <p className="field-error" id={`${id}-error`} aria-live="polite">
        {error ? errorText : ''}
      </p>
    </div>
  )
}

export default PhoneField
