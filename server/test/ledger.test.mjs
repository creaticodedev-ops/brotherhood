import assert from 'node:assert/strict'
import test from 'node:test'
import { missionFigures, summarize } from '../services/ledger.js'

test('caisse balance ignores transfers and reversed rows', () => {
  const summary = summarize(1000, [
    { kind: 'income', amount: 200, status: 'posted' },
    { kind: 'expense', amount: 50, status: 'posted' },
    { kind: 'transfer', amount: 300, status: 'posted' },
    { kind: 'expense', amount: 80, status: 'reversed' },
    { kind: 'reversal', direction: 'in', amount: 80, status: 'posted' },
  ])
  assert.equal(summary.income, 280)
  assert.equal(summary.expense, 50)
  assert.equal(summary.balance, 1230)
})

test('mission figures do not treat an internal transfer as income', () => {
  const figures = missionFigures(
    { _id: 'm1', budget: 500, limit: 400 },
    [
      { mission: 'm1', kind: 'expense', amount: 450, status: 'posted' },
      { mission: 'm1', kind: 'transfer', amount: 200, status: 'posted' },
      { mission: 'm1', kind: 'income', amount: 30, status: 'posted' },
    ],
  )
  assert.equal(figures.income, 30)
  assert.equal(figures.allocated, 200)
  assert.equal(figures.remaining, 50)
  assert.equal(figures.overrun, true)
})
