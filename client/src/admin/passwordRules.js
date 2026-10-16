export const MIN_PASSWORD = 12
export const MAX_PASSWORD = 128

export const classesOf = (value) => [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length

/** Same rules as the API (server/services/password.js). */
export const problemOf = (value) => {
  if (value.length < MIN_PASSWORD) return 'short'
  if (value.length > MAX_PASSWORD) return 'long'
  return new Set(value).size < 5 || classesOf(value) < 3 ? 'weak' : null
}

export const strengthOf = (value) => {
  if (!value) return 0
  if (problemOf(value)) return 1
  return Math.min(4, 2 + (value.length >= 16) + (classesOf(value) === 4))
}
