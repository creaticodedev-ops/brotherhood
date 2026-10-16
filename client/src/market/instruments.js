import { useCallback, useEffect, useState } from 'react'
import { fetchInstruments, GOLD } from './api'

const GOLD_META = {
  id: GOLD,
  category: 'metals',
  symbol: 'XAU/USD',
  name: null,
  base: 'XAU',
  quote: 'USD',
  currency: 'USD',
  digits: 2,
  days: 252,
}

let catalog = null
let pending = null

const load = () => {
  pending ??= fetchInstruments()
    .then((data) => {
      catalog = { ...data, byId: Object.fromEntries(data.instruments.map((item) => [item.id, item])) }
      return catalog
    })
    .catch((error) => {
      pending = null
      throw error
    })
  return pending
}

/** Instrument catalogue, fetched once per page load. */
export const useInstruments = () => {
  const [state, setState] = useState({ catalog, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (catalog) return undefined
    let alive = true
    load()
      .then((value) => alive && setState({ catalog: value, error: null }))
      .catch((error) => alive && setState({ catalog: null, error: error.message }))
    return () => {
      alive = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ catalog: null, error: null })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}

export const instrumentMeta = (value, id) => value?.byId[id] || (id === GOLD ? GOLD_META : null)

/** Localised instrument name: dictionary override, then currency pair, then catalogue name. */
export const instrumentName = (item, tm) => {
  if (!item) return ''
  const named = tm(`terminal.names.${item.id}`)
  if (typeof named === 'string') return named
  if (item.base && item.quote) {
    const currency = (code) => {
      const label = tm(`terminal.currencies.${code}`)
      return typeof label === 'string' ? label : code
    }
    return `${currency(item.base)} / ${currency(item.quote)}`
  }
  return item.name || item.symbol
}
