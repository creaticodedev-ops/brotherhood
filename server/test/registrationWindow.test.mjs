import assert from 'node:assert/strict'
import test from 'node:test'
import { parseZonedInput, readSettingsInput, resolveRegistration, toPublicWindow } from '../../shared/registrationWindow.js'
import { windowAdminOnly } from '../services/registrationWindow.js'

const at = (iso) => new Date(iso)

test('Casablanca wall time is stored as UTC', () => {
  const parsed = parseZonedInput('2026-06-15T20:00', 'Africa/Casablanca')
  assert.equal(parsed.ok, true)
  assert.equal(parsed.date.toISOString(), '2026-06-15T19:00:00.000Z')
})

test('an unconfigured window keeps registration open and hides the countdown', () => {
  const state = resolveRegistration(null, at('2026-06-01T12:00:00.000Z'))
  assert.equal(state.configured, false)
  assert.equal(state.accepting, true)
  assert.equal(state.showCountdown, false)
  assert.equal(state.phase, 'open')
})

test('registration is closed before opening and open at the opening instant', () => {
  const settings = {
    countdownVisible: true,
    timeZone: 'Africa/Casablanca',
    opensAt: '2026-06-15T19:00:00.000Z',
    closesAt: '2026-06-20T19:00:00.000Z',
    override: 'auto',
    messagePreset: 'auto',
  }
  const before = resolveRegistration(settings, at('2026-06-15T18:59:59.000Z'))
  assert.equal(before.phase, 'scheduled')
  assert.equal(before.accepting, false)
  assert.equal(before.targetKind, 'open')
  assert.equal(before.showCountdown, true)

  const opening = resolveRegistration(settings, at('2026-06-15T19:00:00.000Z'))
  assert.equal(opening.phase, 'open')
  assert.equal(opening.accepting, true)
  assert.equal(opening.targetKind, 'close')

  const during = resolveRegistration(settings, at('2026-06-18T12:00:00.000Z'))
  assert.equal(during.accepting, true)
  assert.equal(during.showCountdown, true)
})

test('registration closes at the closing instant and stays closed after it', () => {
  const settings = {
    countdownVisible: true,
    opensAt: '2026-06-15T19:00:00.000Z',
    closesAt: '2026-06-20T19:00:00.000Z',
    override: 'auto',
  }
  const closing = resolveRegistration(settings, at('2026-06-20T19:00:00.000Z'))
  assert.equal(closing.phase, 'closed')
  assert.equal(closing.accepting, false)
  assert.equal(closing.showCountdown, false)

  const after = resolveRegistration(settings, at('2026-06-21T00:00:00.000Z'))
  assert.equal(after.accepting, false)
})

test('hiding the countdown does not change whether applications are accepted', () => {
  const settings = {
    countdownVisible: false,
    opensAt: '2026-06-15T19:00:00.000Z',
    closesAt: '2026-06-20T19:00:00.000Z',
    override: 'auto',
  }
  const during = resolveRegistration(settings, at('2026-06-18T12:00:00.000Z'))
  assert.equal(during.accepting, true)
  assert.equal(during.showCountdown, false)
  const before = resolveRegistration(settings, at('2026-06-01T12:00:00.000Z'))
  assert.equal(before.accepting, false)
  assert.equal(before.showCountdown, false)
})

test('a manual override replaces the schedule and can be cleared', () => {
  const settings = {
    countdownVisible: true,
    opensAt: '2026-06-15T19:00:00.000Z',
    closesAt: '2026-06-20T19:00:00.000Z',
    override: 'closed',
  }
  const forced = resolveRegistration(settings, at('2026-06-18T12:00:00.000Z'))
  assert.equal(forced.scheduled, 'open')
  assert.equal(forced.phase, 'closed')
  assert.equal(forced.accepting, false)
  assert.equal(forced.override, 'closed')

  const restored = resolveRegistration({ ...settings, override: 'auto' }, at('2026-06-18T12:00:00.000Z'))
  assert.equal(restored.phase, 'open')
  assert.equal(restored.accepting, true)

  const early = resolveRegistration({ ...settings, override: 'open' }, at('2026-06-01T12:00:00.000Z'))
  assert.equal(early.scheduled, 'scheduled')
  assert.equal(early.accepting, true)
})

test('an opening time that is not before the closing time is rejected', () => {
  const same = readSettingsInput({
    timeZone: 'Africa/Casablanca',
    opensAt: '2026-06-20T20:00',
    closesAt: '2026-06-20T20:00',
    override: 'auto',
    messagePreset: 'auto',
    countdownVisible: true,
  })
  assert.equal(same.errors.closesAt, 'order')

  const reversed = resolveRegistration(
    { opensAt: '2026-06-21T00:00:00.000Z', closesAt: '2026-06-20T00:00:00.000Z', override: 'auto', countdownVisible: true },
    at('2026-06-19T00:00:00.000Z'),
  )
  assert.equal(reversed.invalid, true)
  assert.equal(reversed.accepting, false)
  assert.equal(reversed.showCountdown, false)
})

test('settings text is limited to known presets', () => {
  const bad = readSettingsInput({
    timeZone: 'Africa/Casablanca',
    opensAt: '',
    closesAt: '',
    override: '<script>',
    messagePreset: '<img onerror=alert(1)>',
    countdownVisible: true,
  })
  assert.equal(bad.errors.override, 'invalid')
  assert.equal(bad.errors.messagePreset, 'invalid')
  assert.equal(bad.data.override, 'auto')
  assert.equal(bad.data.messagePreset, 'auto')
})

test('the public payload omits the override flag', () => {
  const payload = toPublicWindow({ override: 'closed', opensAt: '2026-06-15T19:00:00.000Z', closesAt: '2026-06-20T19:00:00.000Z' }, at('2026-06-18T12:00:00.000Z'))
  assert.equal(payload.accepting, false)
  assert.equal(payload.phase, 'closed')
  assert.equal('override' in payload, false)
})

test('only an account holding registration.manage may change the window', () => {
  const seen = []
  const res = { status: (code) => ({ json: (body) => seen.push({ code, body }) }) }
  windowAdminOnly({ actor: { role: 'staff', permissions: ['recruitment.review'] } }, res, () => seen.push('next'))
  windowAdminOnly({ actor: null }, res, () => seen.push('next'))
  windowAdminOnly({ actor: { role: 'admin', permissions: ['audit.read'] } }, res, () => seen.push('next'))
  windowAdminOnly({ actor: { role: 'admin' } }, res, () => seen.push('next'))
  windowAdminOnly({ actor: { role: 'admin', permissions: ['registration.manage'] } }, res, () => seen.push('next'))
  windowAdminOnly({ actor: { role: 'superadmin', permissions: ['*'], superAdmin: true, id: 'primary' } }, res, () => seen.push('next'))
  assert.deepEqual(seen, [
    { code: 403, body: { error: 'Forbidden' } },
    { code: 403, body: { error: 'Forbidden' } },
    { code: 403, body: { error: 'Forbidden' } },
    { code: 403, body: { error: 'Forbidden' } },
    'next',
    'next',
  ])
})
