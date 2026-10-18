import mongoose from 'mongoose'
import { Story } from '../models/Story.js'
import { STORY_IMAGE_LIMIT, STORY_IMAGE_TYPES, StoryImage } from '../models/StoryImage.js'

export const UPLOAD_PREFIX = '/api/media/'
const UPLOAD_SRC = /^\/api\/media\/([a-f0-9]{24})$/
const STATIC_SRC = /^\/media\/[a-z0-9-]+\.(jpg|png|webp)$/
const ABANDONED_MS = 24 * 60 * 60 * 1000

export const isStoryImageSrc = (src) => STATIC_SRC.test(src || '') || UPLOAD_SRC.test(src || '')

export const uploadIdOf = (src) => UPLOAD_SRC.exec(src || '')?.[1] || null

export const uploadIdsOf = (story) =>
  [...new Set([story?.cover, ...(story?.images || []).map((image) => image.src)].map(uploadIdOf).filter(Boolean))]

export const imageSignatureOk = (type, buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > STORY_IMAGE_LIMIT) return false
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  return false
}

export const storeStoryImage = async (type, buffer, actor) => {
  if (!STORY_IMAGE_TYPES.includes(type) || !imageSignatureOk(type, buffer)) return null
  const doc = await StoryImage.create({ contentType: type, data: buffer, bytes: buffer.length, uploadedBy: actor?.name || '' })
  return { src: `${UPLOAD_PREFIX}${doc._id}`, bytes: doc.bytes }
}

/** Every uploaded image a story points to must exist, otherwise the public page would show a broken picture. */
export const missingUploads = async (ids) => {
  if (!ids.length) return []
  const found = await StoryImage.find({ _id: { $in: ids } }).select('_id').lean()
  const present = new Set(found.map((doc) => String(doc._id)))
  return ids.filter((id) => !present.has(id))
}

export const markAttached = (ids) => (ids.length ? StoryImage.updateMany({ _id: { $in: ids } }, { $set: { attached: true } }) : null)

const referencedElsewhere = async (id, exceptStoryId) => {
  const src = `${UPLOAD_PREFIX}${id}`
  const filter = { $or: [{ cover: src }, { 'images.src': src }] }
  if (exceptStoryId) filter._id = { $ne: exceptStoryId }
  return Boolean(await Story.exists(filter))
}

/** Deletes uploads no story uses any more. An image still referenced by another story is kept. */
export const releaseUploads = async (ids, exceptStoryId) => {
  let removed = 0
  for (const id of ids) {
    if (!mongoose.isValidObjectId(id)) continue
    if (await referencedElsewhere(id, exceptStoryId)) continue
    const result = await StoryImage.deleteOne({ _id: id })
    removed += result.deletedCount
  }
  return removed
}

/** Uploads that were never attached to a saved story within a day are removed, unless something references them. */
export const purgeAbandonedUploads = async () => {
  const stale = await StoryImage.find({ attached: false, createdAt: { $lt: new Date(Date.now() - ABANDONED_MS) } })
    .select('_id')
    .limit(50)
    .lean()
  return releaseUploads(stale.map((doc) => String(doc._id)))
}
