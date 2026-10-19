/**
 * Pure balance math. Transfers never move the central cash total.
 * A reversed row and the reversal that cancels it are both left out, so together they weigh nothing.
 */

export const countsInCaisse = (entry) => Boolean(entry) && entry.status !== 'reversed' && entry.kind !== 'transfer' && entry.kind !== 'reversal'

export const summarize = (opening, entries) => {
  let income = 0
  let expense = 0
  for (const entry of entries) {
    if (!countsInCaisse(entry)) continue
    const amount = Number(entry.amount) || 0
    if (entry.kind === 'income') income += amount
    if (entry.kind === 'expense') expense += amount
  }
  const open = Number(opening) || 0
  return {
    opening: open,
    income,
    expense,
    balance: Math.round((open + income - expense) * 100) / 100,
  }
}

export const missionFigures = (mission, entries) => {
  const rows = entries.filter((entry) => String(entry.mission || '') === String(mission.id || mission._id) && entry.status !== 'reversed')
  const income = rows.filter((entry) => entry.kind === 'income').reduce((sum, entry) => sum + entry.amount, 0)
  const expense = rows.filter((entry) => entry.kind === 'expense').reduce((sum, entry) => sum + entry.amount, 0)
  const allocated = rows.filter((entry) => entry.kind === 'transfer').reduce((sum, entry) => sum + entry.amount, 0)
  const budget = Number(mission.budget) || 0
  const limit = Number(mission.limit) || budget
  return {
    budget,
    limit,
    income,
    expense,
    allocated,
    remaining: Math.round((budget - expense) * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
    overrun: expense > budget || (limit > 0 && expense > limit),
  }
}
