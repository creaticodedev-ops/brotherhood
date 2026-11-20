import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { buildEventProgramPdf, pdfScript } from '../../client/src/site/eventProgramPdf.js'
import { CHILDREN_DAY, canUpdateTask, liveState, publicProgram, readProgram, validateProgram } from '../../shared/eventProgram.js'
import { parseZonedInput } from '../../shared/registrationWindow.js'

const require = createRequire(new URL('../../client/package.json', import.meta.url))
const QRCode = require('qrcode')
const { PDFDocument } = require('pdf-lib')

const published = { ...CHILDREN_DAY, status: 'published', publicUpdatedAt: '2026-11-20T12:00:00.000Z' }

test('the public program keeps the four phases and hides preparation', () => {
  const program = publicProgram(published)
  assert.deepEqual(program.phases.map((phase) => phase.title), ['Accueil & Ouverture', 'Shows & Animations', 'Ateliers & Découverte', 'Clôture'])
  assert.equal(JSON.stringify(program).includes('Démontage'), false)
  assert.equal(JSON.stringify(program).includes('Préparation'), false)
  assert.equal(program.location, '')
  assert.equal(program.eventDate, '')
  assert.equal(program.phases[1].activities.map((item) => item.title).join(), 'Spectacle de magie')
})

test('a draft is not visible to the public', () => {
  assert.equal(publicProgram({ ...published, status: 'draft' }), null)
})

test('an activity that ends before it starts is rejected', () => {
  const { errors } = validateProgram([{ key: 'a', day: 'event', title: 'Phase', start: '16:00', end: '15:00', visibility: 'public', activities: [] }])
  assert.equal(errors.some((error) => error.code === 'order'), true)
})

test('overlapping public activities are warnings, not invented partners', () => {
  const { warnings, errors } = readProgram({
    title: 'Journée',
    phases: [
      {
        key: 'a',
        day: 'event',
        title: 'Un',
        visibility: 'public',
        activities: [
          { key: '1', title: 'Atelier', start: '16:00', end: '17:00', visibility: 'public' },
          { key: '2', title: 'Jeux', start: '16:30', end: '17:30', visibility: 'public' },
        ],
      },
    ],
  })
  assert.equal(errors.length, 0)
  assert.equal(warnings.some((warning) => warning.code === 'overlap'), true)
})

test('nothing is happening until the event date is configured', () => {
  const live = liveState(published, new Date('2026-11-20T15:00:00.000Z'))
  assert.equal(live.current, null)
  assert.equal(live.next, null)
})

test('a configured date resolves the current activity in Casablanca', () => {
  const event = { ...published, eventDate: '2026-11-21' }
  const start = parseZonedInput('2026-11-21T14:00', 'Africa/Casablanca')
  assert.equal(start.ok, true)
  const duringWelcome = liveState(event, new Date(start.date.getTime() + 30 * 60 * 1000))
  assert.equal(duringWelcome.current?.title, 'Accueil des enfants')
  const before = liveState(event, new Date(start.date.getTime() - 60 * 1000))
  assert.equal(before.current, null)
  assert.equal(before.next?.title, 'Accueil des enfants')
})

test('the public program QR is generated locally and points at the event page', async () => {
  const url = 'https://www.brotherhood07.com/events/childrens-day'
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  const png = await QRCode.toDataURL(url, { margin: 1, width: 128, errorCorrectionLevel: 'M' })
  assert.equal(svg.startsWith('<svg'), true)
  assert.equal(svg.includes(url), false)
  assert.equal(png.startsWith('data:image/png;base64,'), true)
})

const pdfFonts = {
  regular: readFileSync(new URL('../../client/public/fonts/Inter-Regular.ttf', import.meta.url)),
  medium: readFileSync(new URL('../../client/public/fonts/Inter-Medium.ttf', import.meta.url)),
  display: readFileSync(new URL('../../client/public/fonts/InterTight-SemiBold.ttf', import.meta.url)),
}

test('the public PDF follows the published program and hides staff preparation', async () => {
  const program = publicProgram(published)
  const script = pdfScript(CHILDREN_DAY)
  assert.equal(script[0], "CHILDREN'S DAY")
  assert.equal(script.includes("Journée de l'enfance"), true)
  assert.equal(script.includes('Spectacle de magie'), true)
  assert.equal(script.includes('Démontage'), false)
  assert.equal(script.includes('Préparation'), false)
  assert.equal(script.includes('Installation'), false)
  assert.equal(script.includes('reception'), false)
  const changed = { ...program, phases: program.phases.map((phase) => ({ ...phase, activities: phase.activities.map((item) => ({ ...item })) })) }
  changed.phases[1].activities[0] = { ...changed.phases[1].activities[0], title: 'Spectacle modifié' }
  assert.equal(pdfScript(changed).includes('Spectacle modifié'), true)
  assert.equal(pdfScript(program).includes('Spectacle modifié'), false)
  const bytes = await buildEventProgramPdf({ program, url: 'https://www.brotherhood07.com/events/childrens-day', fonts: pdfFonts })
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF')
  const doc = await PDFDocument.load(bytes)
  assert.equal(doc.getPageCount(), 1)
  assert.equal(bytes.length < 700000, true)
  const long = {
    ...program,
    parentInfo: 'Les parents restent avec leur groupe pendant les ateliers. '.repeat(40),
    phases: [...program.phases, ...program.phases].map((phase, index) => ({ ...phase, key: `${phase.key}-${index}`, title: `${phase.title} ${index}` })),
  }
  const extra = await PDFDocument.load(await buildEventProgramPdf({ program: long, url: 'https://www.brotherhood07.com/events/childrens-day', fonts: pdfFonts }))
  assert.equal(extra.getPageCount() >= 2, true)
  const poster = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const withPoster = await buildEventProgramPdf({ program, url: 'https://www.brotherhood07.com/events/childrens-day', fonts: pdfFonts, poster })
  const posted = await PDFDocument.load(withPoster)
  assert.equal(posted.getPageCount(), 1)
  assert.equal(withPoster.length > bytes.length, true)
})

test('staff can update only a task assigned to them', () => {
  const task = { assigneeId: 'staff-1', status: 'todo' }
  assert.equal(canUpdateTask({ id: 'staff-1', permissions: ['events.operate'] }, task), true)
  assert.equal(canUpdateTask({ id: 'staff-2', permissions: ['events.operate'] }, task), false)
  assert.equal(canUpdateTask({ id: 'staff-2', permissions: ['events.operate'] }, { assigneeId: '' }), false)
  assert.equal(canUpdateTask({ id: 'admin', permissions: ['events.manage'] }, task), true)
})
