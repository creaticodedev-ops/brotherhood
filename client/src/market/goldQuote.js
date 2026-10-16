import { GOLD } from './api'
import { retryQuote, useQuote } from './quoteStore'

/** Live XAU/USD quote shared by the landing page dial and the terminal. */
export const useGoldQuote = () => useQuote(GOLD)

export const retryGoldQuote = () => retryQuote(GOLD)
