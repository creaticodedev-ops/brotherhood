import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Portrait } from '../models/Portrait.js'

/** Where portraits were written before they lived in MongoDB. Render wipes this folder on every deploy, restart, and idle spin-down. */
const LEGACY_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads/portraits')
const NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/i
const ID = /^[a-f0-9]{24}$/i
export const PORTRAIT_LIMIT = 1_500_000
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export const portraitSignatureOk = (type, buffer) => {
  if (!buffer || buffer.length < 12 || buffer.length > PORTRAIT_LIMIT) return false
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  return false
}

const asBuffer = (value) => {
  if (Buffer.isBuffer(value)) return value
  if (value?.buffer) return Buffer.from(value.buffer)
  return Buffer.from(value || [])
}

export const portraitFile = (name) => {
  if (!NAME.test(name || '')) return null
  const file = path.resolve(LEGACY_DIR, name)
  return file.startsWith(`${LEGACY_DIR}${path.sep}`) ? file : null
}

export const portraitName = (id, type) => `${id}.${TYPES[type]}`

const contentTypeFor = (name) => (name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg')

/** Stores the portrait in MongoDB and resolves only once the write is acknowledged. Returns the reference kept on the registration. */
export const savePortrait = async (id, photo) => {
  const registration = String(id || '')
  if (!ID.test(registration) || !TYPES[photo?.type] || !portraitSignatureOk(photo.type, photo.buffer)) {
    throw new Error('Invalid portrait')
  }
  await Portrait.findOneAndUpdate(
    { registration },
    { $set: { contentType: photo.type, data: photo.buffer, bytes: photo.buffer.length } },
    { upsert: true },
  )
  return portraitName(registration, photo.type)
}

/** Adds a portrait only when the registration has none yet. An existing database copy is never replaced. */
export const keepPortraitIfMissing = async (id, contentType, data) => {
  const registration = String(id || '')
  if (!ID.test(registration) || !portraitSignatureOk(contentType, data)) return false
  await Portrait.updateOne(
    { registration },
    { $setOnInsert: { registration, contentType, data, bytes: data.length } },
    { upsert: true },
  )
  return true
}

export const readStoredPortrait = async (id) => {
  const registration = String(id || '')
  if (!ID.test(registration)) return null
  const doc = await Portrait.findOne({ registration }).select('contentType data').lean()
  if (!doc) return null
  const data = asBuffer(doc.data)
  if (!portraitSignatureOk(doc.contentType, data)) return null
  return { contentType: doc.contentType, data }
}

/** Copies a portrait that still exists in the legacy folder into MongoDB. The file itself is left untouched. */
export const rememberLocalPortrait = async (id, name) => {
  const file = portraitFile(name)
  if (!file) return null
  let data
  try {
    data = await readFile(file)
  } catch {
    return null
  }
  const contentType = contentTypeFor(name)
  if (!(await keepPortraitIfMissing(id, contentType, data))) return null
  return readStoredPortrait(id)
}

export const removePortrait = async (id) => {
  const registration = String(id || '')
  if (!ID.test(registration)) return
  await Portrait.deleteOne({ registration })
}
