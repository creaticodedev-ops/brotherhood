/** Turns a large event photo into a file the poster store can keep. */

export const POSTER_INPUT_LIMIT = 25 * 1024 * 1024
export const POSTER_STORE_LIMIT = 4_200_000
export const POSTER_EDGE = 3200

const KEEP_BYTES = 3_800_000
const MAX_PIXELS = 48_000_000
const STORED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const DECLARED = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/heic': 'image/heic',
  'image/heif': 'image/heif',
}

const EXTENSIONS = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

const fail = (code) => Object.assign(new Error(code), { code })

export const posterSourceType = (file) => {
  const declared = DECLARED[String(file?.type || '').toLowerCase()]
  if (declared) return declared
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase()
  return EXTENSIONS[extension] || ''
}

/** Longest side is capped and the original ratio is kept. */
export const posterDimensions = (width, height, edge = POSTER_EDGE) => {
  if (!width || !height) return { width: 0, height: 0 }
  const longest = Math.max(width, height)
  const scale = Math.min(1, edge / longest)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

const decode = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* The browser could not decode this bitmap. Try an image element next. */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(fail('read'))
    }
    image.src = url
  })
}

const encode = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

const draw = (picture, width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(picture, 0, 0, width, height)
  return canvas
}

const asStored = (blob, requested) => {
  const type = STORED_TYPES.has(blob?.type) ? blob.type : requested
  if (!blob?.size || blob.size > POSTER_STORE_LIMIT || !STORED_TYPES.has(type)) return null
  return blob.type === type ? blob : new Blob([blob], { type })
}

const compress = async (picture, width, height, sourceType) => {
  const canvas = draw(picture, width, height)
  const attempts = sourceType === 'image/png' ? [['image/png', undefined]] : []
  attempts.push(['image/webp', 0.92], ['image/webp', 0.84], ['image/jpeg', 0.92], ['image/jpeg', 0.84], ['image/jpeg', 0.76])
  for (const [type, quality] of attempts) {
    const stored = asStored(await encode(canvas, type, quality), type)
    if (stored) return stored
  }
  return null
}

/**
 * Returns the original file when it is already a sensible stored image.
 * Otherwise resizes the longest side to 3200 px and compresses it under the store limit.
 */
export const prepareEventPoster = async (file) => {
  const type = posterSourceType(file)
  if (!type) throw fail('type')
  if (!file?.size) throw fail('read')
  if (file.size > POSTER_INPUT_LIMIT) throw fail('size')

  let picture
  try {
    picture = await decode(file)
  } catch {
    throw fail(type === 'image/heic' || type === 'image/heif' ? 'heic' : 'read')
  }

  try {
    const width = picture.width || picture.naturalWidth
    const height = picture.height || picture.naturalHeight
    if (!width || !height) throw fail('read')
    if (width * height > MAX_PIXELS) throw fail('size')

    const fitted = posterDimensions(width, height)
    const ready =
      STORED_TYPES.has(type) &&
      STORED_TYPES.has(file.type) &&
      file.size <= KEEP_BYTES &&
      Math.max(width, height) <= POSTER_EDGE
    if (ready) return { file, optimized: false }

    let stored = await compress(picture, fitted.width, fitted.height, type)
    if (!stored) {
      const smaller = posterDimensions(width, height, 2400)
      stored = await compress(picture, smaller.width, smaller.height, 'image/jpeg')
    }
    if (!stored) throw fail('size')
    return { file: stored, optimized: true }
  } finally {
    picture.close?.()
  }
}
