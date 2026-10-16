/**
 * Instruments available in the market terminal.
 * - `duka`: Dukascopy instrument code (candles, ticks and fallback quotes).
 * - `feed: 'swissquote'`: live quote taken from the Swissquote public feed (metals, forex) instead of Dukascopy ticks.
 * - `digits`: display precision; the API keeps one extra digit.
 * - `base` / `quote`: currency codes, used by the client to build localised pair names.
 * - `days`: trading days per year, used to annualise volatility.
 */

export const CATEGORIES = ['metals', 'forex', 'indices', 'stocks', 'commodities', 'crypto', 'bonds']

const currencyPair = (category, base, quote, digits) => ({
  id: `${base}${quote}`,
  category,
  symbol: `${base}/${quote}`,
  duka: `${base}/${quote}`,
  feed: 'swissquote',
  base,
  quote,
  currency: quote,
  digits,
})

const metal = (base, quote, digits) => currencyPair('metals', base, quote, digits)
const pair = (base, quote, digits) => currencyPair('forex', base, quote, digits)

const index = (id, symbol, duka, name, currency, digits = 2) => ({ id, category: 'indices', symbol, duka, name, currency, digits })

const stock = (id, name, market, currency) => ({
  id,
  category: 'stocks',
  symbol: id,
  duka: `${id}.${market}/${currency}`,
  name,
  currency,
  digits: 2,
})

const commodity = (id, symbol, duka, name, digits) => ({ id, category: 'commodities', symbol, duka, name, currency: 'USD', digits })

const crypto = (base, name, digits) => ({
  id: `${base}USD`,
  category: 'crypto',
  symbol: `${base}/USD`,
  duka: `${base}/USD`,
  name,
  currency: 'USD',
  digits,
  days: 365,
})

const bond = (id, symbol, duka, name, currency) => ({ id, category: 'bonds', symbol, duka, name, currency, digits: 3 })

export const INSTRUMENTS = [
  metal('XAU', 'USD', 2),
  metal('XAG', 'USD', 3),
  metal('XAU', 'EUR', 2),

  pair('EUR', 'USD', 5),
  pair('GBP', 'USD', 5),
  pair('USD', 'JPY', 3),
  pair('USD', 'CHF', 5),
  pair('AUD', 'USD', 5),
  pair('USD', 'CAD', 5),
  pair('NZD', 'USD', 5),
  pair('EUR', 'GBP', 5),
  pair('EUR', 'JPY', 3),
  pair('GBP', 'JPY', 3),
  pair('EUR', 'CHF', 5),
  pair('USD', 'CNH', 5),
  pair('USD', 'MXN', 4),
  pair('USD', 'ZAR', 4),

  index('US500', 'US 500', 'USA500.IDX/USD', 'S&P 500', 'USD'),
  index('US100', 'US 100', 'USATECH.IDX/USD', 'Nasdaq 100', 'USD'),
  index('US30', 'US 30', 'USA30.IDX/USD', 'Dow Jones 30', 'USD'),
  index('DE40', 'DE 40', 'DEU.IDX/EUR', 'DAX 40', 'EUR'),
  index('FR40', 'FR 40', 'FRA.IDX/EUR', 'CAC 40', 'EUR'),
  index('UK100', 'UK 100', 'GBR.IDX/GBP', 'FTSE 100', 'GBP'),
  index('EU50', 'EU 50', 'EUS.IDX/EUR', 'Euro Stoxx 50', 'EUR'),
  index('JP225', 'JP 225', 'JPN.IDX/JPY', 'Nikkei 225', 'JPY'),
  index('HK50', 'HK 50', 'HKG.IDX/HKD', 'Hang Seng', 'HKD'),
  index('DXY', 'DXY', 'DOLLAR.IDX/USD', 'US Dollar Index', 'USD', 3),
  index('VIX', 'VIX', 'VOL.IDX/USD', 'Volatility Index', 'USD'),

  stock('AAPL', 'Apple', 'US', 'USD'),
  stock('MSFT', 'Microsoft', 'US', 'USD'),
  stock('NVDA', 'Nvidia', 'US', 'USD'),
  stock('AMZN', 'Amazon', 'US', 'USD'),
  stock('GOOGL', 'Alphabet', 'US', 'USD'),
  stock('TSLA', 'Tesla', 'US', 'USD'),
  stock('JPM', 'JPMorgan Chase', 'US', 'USD'),
  stock('NFLX', 'Netflix', 'US', 'USD'),
  stock('MC', 'LVMH', 'FR', 'EUR'),
  stock('SAP', 'SAP', 'DE', 'EUR'),
  stock('NESN', 'Nestlé', 'CH', 'CHF'),

  commodity('BRENT', 'BRENT', 'BRENT.CMD/USD', 'Brent crude oil', 2),
  commodity('WTI', 'WTI', 'LIGHT.CMD/USD', 'WTI crude oil', 2),
  commodity('NATGAS', 'NATGAS', 'GAS.CMD/USD', 'Natural gas', 3),
  commodity('COPPER', 'COPPER', 'COPPER.CMD/USD', 'Copper', 4),
  commodity('COCOA', 'COCOA', 'COCOA.CMD/USD', 'Cocoa', 0),

  crypto('BTC', 'Bitcoin', 1),
  crypto('ETH', 'Ethereum', 2),
  crypto('SOL', 'Solana', 2),
  crypto('XRP', 'XRP', 4),

  bond('USTBOND', 'US T-BOND', 'USTBOND.TR/USD', 'US Treasury Bond', 'USD'),
  bond('BUND', 'BUND', 'BUND.TR/EUR', 'Euro Bund', 'EUR'),
]

export const DEFAULT_INSTRUMENT = 'XAUUSD'

const byId = new Map(INSTRUMENTS.map((item) => [item.id, item]))

export const getInstrument = (id = DEFAULT_INSTRUMENT) => byId.get(String(id).toUpperCase()) || null

/** Catalogue fields exposed to the client. */
export const publicInstrument = ({ id, category, symbol, name, base, quote, currency, digits, days }) => ({
  id,
  category,
  symbol,
  name: name ?? null,
  base: base ?? null,
  quote: quote ?? null,
  currency,
  digits,
  days: days ?? 252,
})
