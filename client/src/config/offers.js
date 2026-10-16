/**
 * Offer levels shown in the landing page preview.
 *
 * PLACEHOLDER DATA — no real package exists yet. Copy lives in the i18n
 * dictionaries under `offers.items.<id>`. When packages are defined, set
 * `capital` to `{ min, max?, currency }` and it will be formatted per locale.
 * Never add expected returns here.
 */
export const OFFERS = [
  { id: 'essential', level: 1, capital: null, featured: false },
  { id: 'advanced', level: 2, capital: null, featured: true },
  { id: 'premium', level: 3, capital: null, featured: false },
]

export const formatCapital = (capital, locale) => {
  if (!capital?.min) return null
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: capital.currency || 'USD',
    maximumFractionDigits: 0,
  })
  return capital.max ? `${fmt.format(capital.min)} – ${fmt.format(capital.max)}` : `${fmt.format(capital.min)}+`
}
