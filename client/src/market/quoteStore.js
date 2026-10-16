import { useSyncExternalStore } from 'react'
import { fetchQuote } from './api'

/**
 * One shared poller per instrument for its live quote.
 * A poller only runs while at least one component is subscribed, and slows down in background tabs.
 */

const LIVE_INTERVAL = 2000
const HIDDEN_INTERVAL = 15000
const ERROR_INTERVAL = 6000
const MAX_TICKS = 40

const createStore = (symbol) => {
  let state = { status: 'loading', quote: null, direction: null, seq: 0, ticks: [], error: null }
  const listeners = new Set()
  let timer = 0
  let running = false
  let generation = 0

  const emit = (patch) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }

  const poll = async () => {
    timer = 0
    const current = generation
    let delay = document.hidden ? HIDDEN_INTERVAL : LIVE_INTERVAL
    try {
      const quote = await fetchQuote(symbol)
      if (current !== generation) return
      const previous = state.quote
      const moved = previous && quote.price !== previous.price
      const direction = moved ? (quote.price > previous.price ? 'up' : 'down') : state.direction
      const ticks =
        moved || !previous
          ? [{ ts: quote.ts, price: quote.price, direction: moved ? direction : null }, ...state.ticks].slice(0, MAX_TICKS)
          : state.ticks
      emit({
        status: quote.marketOpen ? 'live' : 'closed',
        quote,
        direction,
        seq: moved ? state.seq + 1 : state.seq,
        ticks,
        error: null,
      })
    } catch (error) {
      if (current !== generation) return
      delay = ERROR_INTERVAL
      emit({ status: state.quote ? 'stale' : 'error', error: error.message })
    }
    if (running) timer = window.setTimeout(poll, delay)
  }

  const onVisibility = () => {
    if (!running || document.hidden) return
    generation += 1
    window.clearTimeout(timer)
    poll()
  }

  const start = () => {
    running = true
    generation += 1
    document.addEventListener('visibilitychange', onVisibility)
    poll()
  }

  const stop = () => {
    running = false
    generation += 1
    window.clearTimeout(timer)
    timer = 0
    document.removeEventListener('visibilitychange', onVisibility)
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      if (listeners.size === 1) start()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) stop()
      }
    },
    getSnapshot: () => state,
    retry: () => {
      if (!running) return
      generation += 1
      window.clearTimeout(timer)
      emit({ status: state.quote ? state.status : 'loading' })
      poll()
    },
  }
}

const stores = new Map()
const storeFor = (symbol) => {
  if (!stores.has(symbol)) stores.set(symbol, createStore(symbol))
  return stores.get(symbol)
}

export const useQuote = (symbol) => {
  const store = storeFor(symbol)
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export const retryQuote = (symbol) => storeFor(symbol).retry()
