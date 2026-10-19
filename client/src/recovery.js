const RELOADED_AT = 'bh-reloaded-at'
const QUIET_MS = 30_000

/** Chrome, Safari and Firefox wordings for a code file that failed to load (dropped connection or newer deployment). */
const CHUNK_ERROR = /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload css|not a valid javascript mime type|loading chunk/i

export const isChunkError = (error) => CHUNK_ERROR.test(String(error?.message || error || ''))

/**
 * Reloads the page at most once every 30 seconds, so a tab opened before a deployment picks up the new files.
 * Without sessionStorage it never reloads by itself: the fallback screen offers the button instead.
 */
export const reloadOnce = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) || 0)
    if (Date.now() - last < QUIET_MS) return false
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
