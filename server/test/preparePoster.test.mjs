import assert from 'node:assert/strict'
import test from 'node:test'
import { POSTER_EDGE, POSTER_INPUT_LIMIT, POSTER_STORE_LIMIT, posterDimensions, posterSourceType } from '../../client/src/admin/preparePoster.js'
import { STORY_IMAGE_LIMIT } from '../models/StoryImage.js'

test('a prepared poster stays inside the image stored in MongoDB', () => {
  assert.equal(POSTER_INPUT_LIMIT, 25 * 1024 * 1024)
  assert.ok(POSTER_STORE_LIMIT < STORY_IMAGE_LIMIT)
  assert.ok(POSTER_STORE_LIMIT > 3_000_000)
})

test('phone and extension types are recognized before optimization', () => {
  assert.equal(posterSourceType({ type: 'image/jpeg', name: 'photo.jpg' }), 'image/jpeg')
  assert.equal(posterSourceType({ type: 'image/jpg', name: 'photo.jpg' }), 'image/jpeg')
  assert.equal(posterSourceType({ type: '', name: 'affiche.PNG' }), 'image/png')
  assert.equal(posterSourceType({ type: 'image/heic', name: 'IMG_2201.HEIC' }), 'image/heic')
  assert.equal(posterSourceType({ type: 'image/heif', name: 'photo.heif' }), 'image/heif')
  assert.equal(posterSourceType({ type: 'application/pdf', name: 'notes.pdf' }), '')
})

test('portrait and landscape posters keep their ratio under the long-edge cap', () => {
  const portrait = posterDimensions(4000, 6000)
  const landscape = posterDimensions(6000, 3375)
  assert.equal(Math.max(portrait.width, portrait.height), POSTER_EDGE)
  assert.equal(Math.max(landscape.width, landscape.height), POSTER_EDGE)
  assert.ok(Math.abs(portrait.width / portrait.height - 4000 / 6000) < 0.002)
  assert.ok(Math.abs(landscape.width / landscape.height - 6000 / 3375) < 0.002)
  assert.deepEqual(posterDimensions(1200, 800), { width: 1200, height: 800 })
  assert.deepEqual(posterDimensions(0, 400), { width: 0, height: 0 })
})
