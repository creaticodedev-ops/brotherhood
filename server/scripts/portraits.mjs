/**
 * Portrait maintenance. Nothing here deletes or overwrites data.
 *
 *   node scripts/portraits.mjs report
 *     Lists applications that reference a photo with no copy in MongoDB (ids and dates only).
 *
 *   node scripts/portraits.mjs rescue [--api=https://www.brotherhood07.com] [--email=staff@example.com]
 *     Downloads each missing photo from the running API (admin sign-in required) and stores it in MongoDB
 *     only when MongoDB has no copy yet. Run it before deploying, because a deploy empties the old folder.
 *
 * Reads MONGODB_URI from the environment or server/.env.
 */
import 'dotenv/config'
import { Writable } from 'node:stream'
import readline from 'node:readline/promises'
import mongoose from 'mongoose'
import { Portrait } from '../models/Portrait.js'
import { Registration } from '../models/Registration.js'
import { keepPortraitIfMissing, readStoredPortrait } from '../services/portrait.js'

const args = Object.fromEntries(
  process.argv.slice(3).map((item) => {
    const [key, ...rest] = item.replace(/^--/, '').split('=')
    return [key, rest.join('=')]
  }),
)
const mode = process.argv[2]
const redact = (value) =>
  String(value)
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, 'mongodb://[redacted]')
    .replace(/[\w.-]*mongodb\.net/gi, '[atlas-host]')

const missingPortraits = async () => {
  const withPhoto = await Registration.find({ photo: { $nin: ['', null] } }).select('_id createdAt').sort({ createdAt: 1 }).lean()
  const stored = new Set((await Portrait.find({ registration: { $in: withPhoto.map((doc) => doc._id) } }).select('registration').lean()).map((doc) => String(doc.registration)))
  return { total: withPhoto.length, stored: stored.size, missing: withPhoto.filter((doc) => !stored.has(String(doc._id))) }
}

const ask = async (question, hidden = false) => {
  const muted = new Writable({
    write(chunk, _encoding, done) {
      if (!hidden) process.stdout.write(chunk)
      done()
    },
  })
  const rl = readline.createInterface({ input: process.stdin, output: muted, terminal: true })
  process.stdout.write(question)
  const answer = await rl.question('')
  rl.close()
  if (hidden) process.stdout.write('\n')
  return answer.trim()
}

const signIn = async (api) => {
  const email = args.email || ''
  const password = await ask(email ? `Password for ${email}: ` : 'Administrator password: ', true)
  const response = await fetch(`${api}/api/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email ? { email, password } : { password }),
  })
  if (!response.ok) throw new Error(`Sign-in refused (${response.status})`)
  const cookie = response.headers.getSetCookie().map((line) => line.split(';')[0]).find((pair) => pair.startsWith('usb_admin='))
  if (!cookie) throw new Error('Sign-in returned no session')
  return cookie
}

const report = async () => {
  const { total, stored, missing } = await missingPortraits()
  console.log(`Applications with a photo reference: ${total}`)
  console.log(`Photos stored in MongoDB: ${stored}`)
  console.log(`Photos without a MongoDB copy: ${missing.length}`)
  missing.forEach((doc) => console.log(`  ${doc._id}  submitted ${new Date(doc.createdAt).toISOString().slice(0, 10)}`))
}

const rescue = async () => {
  const api = (args.api || 'https://www.brotherhood07.com').replace(/\/+$/, '')
  const { missing } = await missingPortraits()
  if (!missing.length) {
    console.log('Every referenced photo already has a MongoDB copy.')
    return
  }
  const cookie = await signIn(api)
  const result = { rescued: [], unavailable: [], failed: [] }
  for (const doc of missing) {
    const id = String(doc._id)
    try {
      const response = await fetch(`${api}/api/admin/registrations/${id}/photo`, { headers: { Cookie: cookie } })
      if (response.status === 404) {
        result.unavailable.push(id)
        continue
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim()
      const data = Buffer.from(await response.arrayBuffer())
      if (!(await keepPortraitIfMissing(id, contentType, data))) throw new Error('Not a valid image')
      const check = await readStoredPortrait(id)
      if (!check || !check.data.equals(data)) throw new Error('Stored copy did not match')
      result.rescued.push(id)
    } catch (error) {
      result.failed.push(`${id} (${error.message})`)
    }
  }
  console.log(`Rescued into MongoDB: ${result.rescued.length}`)
  result.rescued.forEach((id) => console.log(`  ${id}`))
  console.log(`No longer on the server: ${result.unavailable.length}`)
  result.unavailable.forEach((id) => console.log(`  ${id}`))
  if (result.failed.length) {
    console.log(`Failed, nothing was changed for these: ${result.failed.length}`)
    result.failed.forEach((line) => console.log(`  ${line}`))
    process.exitCode = 1
  }
}

if (!['report', 'rescue'].includes(mode)) {
  console.log('Usage: node scripts/portraits.mjs report | rescue [--api=URL] [--email=staff@example.com]')
  process.exit(1)
}
const uri = process.env.MONGODB_URI?.trim()
if (!uri) {
  console.error('MONGODB_URI is not set')
  process.exit(1)
}
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  console.log(`Database: ${mongoose.connection.name}`)
  await (mode === 'report' ? report() : rescue())
} catch (error) {
  console.error(redact(error.message))
  process.exitCode = 1
} finally {
  await mongoose.disconnect().catch(() => {})
}
