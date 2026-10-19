import assert from 'node:assert/strict'
import test from 'node:test'
import { AUDIT_AREAS, day, missionsFor } from '../routes/command.js'

const missions = [
  { _id: '1', title: 'Caravane', assignees: ['Sara Idrissi', 'Youssef'] },
  { _id: '2', title: 'Collecte', assignees: [' sara idrissi '] },
  { _id: '3', title: 'Atelier', assignees: [] },
]

test('an account that manages missions sees every mission', () => {
  assert.deepEqual(missionsFor({ name: 'Admin', permissions: ['missions.manage'] }, missions).map((doc) => doc._id), ['1', '2', '3'])
  assert.deepEqual(missionsFor({ name: 'Super Admin', permissions: ['*'] }, missions).length, 3)
})

test('other accounts only see the missions that name them, whatever the case or spacing', () => {
  assert.deepEqual(missionsFor({ name: 'Sara Idrissi', permissions: ['finance.record'] }, missions).map((doc) => doc._id), ['1', '2'])
  assert.deepEqual(missionsFor({ name: 'Youssef', permissions: [] }, missions).map((doc) => doc._id), ['1'])
  assert.deepEqual(missionsFor({ name: 'Nadia', permissions: ['recruitment.review'] }, missions), [])
})

test('an account without a name never matches a mission without people in charge', () => {
  assert.deepEqual(missionsFor({ name: '', permissions: [] }, missions), [])
  assert.deepEqual(missionsFor(null, missions), [])
})

test('an empty or missing date is stored as no date, never as 1970', () => {
  for (const value of [null, undefined, '', '   ', 0, false, 'demain']) assert.equal(day(value), null)
  assert.equal(day('2026-11-02').toISOString().slice(0, 10), '2026-11-02')
  assert.equal(day('2026-11-02T08:30:00.000Z').toISOString(), '2026-11-02T08:30:00.000Z')
})

test('journal areas group the recorded actions by module', () => {
  const area = (action) => Object.keys(AUDIT_AREAS).filter((key) => AUDIT_AREAS[key].test(action))
  assert.deepEqual(area('application.accepted'), ['applications'])
  assert.deepEqual(area('whatsapp.opened'), ['applications'])
  assert.deepEqual(area('mission.update'), ['missions'])
  assert.deepEqual(area('finance.reverse'), ['finance'])
  assert.deepEqual(area('staff.permissions'), ['team'])
  assert.deepEqual(area('story.order'), ['content'])
  assert.deepEqual(area('registration.update'), ['registration'])
  assert.deepEqual(area('unknown'), [])
})
