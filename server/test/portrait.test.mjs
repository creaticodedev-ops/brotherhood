import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import mongoose from 'mongoose'
import { Portrait } from '../models/Portrait.js'
import { keepPortraitIfMissing, portraitFile, readStoredPortrait, rememberLocalPortrait, savePortrait } from '../services/portrait.js'

const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEA8QEA8PDw8PDw8PDw8PFREQEBQOFBQYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/9k=',
  'base64',
)
const TINY_PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16, 1)])

const localUri = () => {
  try {
    const line = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/).find((item) => item.startsWith('MONGODB_URI='))
    const uri = (line || '').slice('MONGODB_URI='.length).trim()
    return /^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri) ? uri : ''
  } catch {
    return ''
  }
}

const withLocalDb = async (t, run) => {
  const uri = localUri()
  if (!uri) return t.skip('local database only')
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 })
  } catch {
    return t.skip('local database is not running')
  }
  const id = new mongoose.Types.ObjectId().toString()
  try {
    await run(id, uri)
  } finally {
    await Portrait.deleteOne({ registration: id })
    await mongoose.disconnect()
  }
}

test('a portrait is refused before it is stored when the bytes are not an image', async () => {
  await assert.rejects(() => savePortrait('a'.repeat(24), { type: 'image/jpeg', buffer: Buffer.from('hello') }), /Invalid portrait/)
  await assert.rejects(() => savePortrait('a'.repeat(24), { type: 'image/gif', buffer: TINY_JPEG }), /Invalid portrait/)
  await assert.rejects(() => savePortrait('../../etc', { type: 'image/jpeg', buffer: TINY_JPEG }), /Invalid portrait/)
})

test('a saved portrait lives in the database only and survives a reconnect', async (t) => {
  await withLocalDb(t, async (id, uri) => {
    const name = await savePortrait(id, { type: 'image/jpeg', buffer: TINY_JPEG })
    assert.equal(name, `${id}.jpg`)
    await assert.rejects(() => stat(portraitFile(name)), { code: 'ENOENT' })
    await mongoose.disconnect()
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 })
    const stored = await readStoredPortrait(id)
    assert.equal(stored.contentType, 'image/jpeg')
    assert.ok(stored.data.equals(TINY_JPEG))
  })
})

test('a rescued copy never replaces a portrait that is already stored', async (t) => {
  await withLocalDb(t, async (id) => {
    await savePortrait(id, { type: 'image/jpeg', buffer: TINY_JPEG })
    assert.equal(await keepPortraitIfMissing(id, 'image/png', TINY_PNG), true)
    const stored = await readStoredPortrait(id)
    assert.equal(stored.contentType, 'image/jpeg')
    assert.ok(stored.data.equals(TINY_JPEG))
    assert.equal(await keepPortraitIfMissing(id, 'image/jpeg', Buffer.from('not an image at all')), false)
  })
})

test('a portrait left in the old folder is copied into the database and the file is kept', async (t) => {
  await withLocalDb(t, async (id) => {
    const name = `${id}.jpg`
    const file = portraitFile(name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, TINY_JPEG)
    try {
      const copied = await rememberLocalPortrait(id, name)
      assert.ok(copied.data.equals(TINY_JPEG))
      assert.ok((await stat(file)).isFile())
      assert.ok((await readStoredPortrait(id)).data.equals(TINY_JPEG))
    } finally {
      await unlink(file).catch(() => {})
    }
  })
})
