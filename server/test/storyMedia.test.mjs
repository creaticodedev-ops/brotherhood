import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import mongoose from 'mongoose'
import { Story } from '../models/Story.js'
import { StoryImage } from '../models/StoryImage.js'
import { imageSignatureOk, isStoryImageSrc, releaseUploads, storeStoryImage, uploadIdOf, uploadIdsOf } from '../services/storyMedia.js'

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)])

const localUri = () => {
  try {
    const line = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).find((item) => item.startsWith('MONGODB_URI='))
    const uri = (line || '').slice('MONGODB_URI='.length).trim()
    return /^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri) ? uri : ''
  } catch {
    return ''
  }
}

test('only site photographs and stored uploads are accepted as story images', () => {
  assert.equal(isStoryImageSrc('/media/sports-team.jpg'), true)
  assert.equal(isStoryImageSrc(`/api/media/${'a'.repeat(24)}`), true)
  assert.equal(isStoryImageSrc('https://example.com/x.jpg'), false)
  assert.equal(isStoryImageSrc('/api/media/../../etc/passwd'), false)
  assert.equal(isStoryImageSrc('/media/../secret.jpg'), false)
  assert.equal(isStoryImageSrc(''), false)
})

test('upload ids are read from the cover and every image, once each', () => {
  const a = 'a'.repeat(24)
  const b = 'b'.repeat(24)
  assert.equal(uploadIdOf(`/api/media/${a}`), a)
  assert.equal(uploadIdOf('/media/sports-team.jpg'), null)
  assert.deepEqual(uploadIdsOf({ cover: `/api/media/${a}`, images: [{ src: `/api/media/${a}` }, { src: `/api/media/${b}` }, { src: '/media/x.jpg' }] }), [a, b])
})

test('image bytes must match the declared type', () => {
  assert.equal(imageSignatureOk('image/jpeg', JPEG), true)
  assert.equal(imageSignatureOk('image/png', JPEG), false)
  assert.equal(imageSignatureOk('image/jpeg', Buffer.from('<svg onload=alert(1)>')), false)
  assert.equal(imageSignatureOk('image/gif', JPEG), false)
})

test('an upload still used by another story is never deleted', async (t) => {
  const uri = localUri()
  if (!uri) return t.skip('local database only')
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 })
  } catch {
    return t.skip('local database is not running')
  }
  const slugs = ['media-test-one', 'media-test-two']
  try {
    const shared = await storeStoryImage('image/jpeg', JPEG, { name: 'test' })
    const lonely = await storeStoryImage('image/jpeg', JPEG, { name: 'test' })
    const one = await Story.create({ kind: 'mission', slug: slugs[0], title: 'One', images: [{ src: shared.src }, { src: lonely.src }] })
    await Story.create({ kind: 'mission', slug: slugs[1], title: 'Two', images: [{ src: shared.src }] })
    const removed = await releaseUploads([uploadIdOf(shared.src), uploadIdOf(lonely.src)], one._id)
    assert.equal(removed, 1)
    assert.ok(await StoryImage.exists({ _id: uploadIdOf(shared.src) }))
    assert.equal(await StoryImage.exists({ _id: uploadIdOf(lonely.src) }), null)
    await StoryImage.deleteOne({ _id: uploadIdOf(shared.src) })
  } finally {
    await Story.deleteMany({ slug: { $in: slugs } })
    await mongoose.disconnect()
  }
})
