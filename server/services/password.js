import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const N = 2 ** 15
const R = 8
const P = 1
const KEY_LENGTH = 64
const MAX_MEM = 128 * N * R * 2

export const MIN_PASSWORD = 12
export const MAX_PASSWORD = 128

const derive = (password, salt, { n = N, r = R, p = P } = {}) =>
  new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { N: n, r, p, maxmem: Math.max(MAX_MEM, 128 * n * r * 2) }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })

/** `scrypt$N$r$p$salt$hash` (base64url), so parameters can be raised later without breaking stored hashes. */
export const hashPassword = async (password) => {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export const verifyPassword = async (password, stored) => {
  if (typeof password !== 'string' || !password || password.length > MAX_PASSWORD || typeof stored !== 'string') return false
  const [scheme, n, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await derive(password, Buffer.from(salt, 'base64url'), { n: Number(n), r: Number(r), p: Number(p) })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** Returns an error code, or null when the new password is acceptable. */
export const passwordProblem = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return 'short'
  if (password.length > MAX_PASSWORD) return 'long'
  if (new Set(password).size < 5) return 'weak'
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  return classes < 3 ? 'weak' : null
}
