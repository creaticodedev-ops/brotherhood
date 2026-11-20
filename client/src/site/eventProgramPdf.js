import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

const PAGE_W = 595.28
const PAGE_H = 841.89
const M = 34
const HEADER = 158
const HEADER_NEXT = 54
const FOOTER = 62
const RAIL = 118
const RED = rgb(200 / 255, 16 / 255, 46 / 255)
const INK = rgb(5 / 255, 6 / 255, 5 / 255)
const PAPER = rgb(244 / 255, 245 / 255, 243 / 255)
const MUTED = rgb(78 / 255, 82 / 255, 80 / 255)
const WHITE = rgb(1, 1, 1)

const latin = (value) =>
  String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00ab/g, '"')
    .replace(/\u00bb/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const sameWords = (left, right) => latin(left).replace(/['".]/g, '').toLowerCase() === latin(right).replace(/['".]/g, '').toLowerCase()

const span = (start, end) => [start, end].filter(Boolean).join(' - ')

export const campaignTitle = (program) => (program?.slug === 'childrens-day' ? "CHILDREN'S DAY" : latin(program?.title))

export const publicPhases = (program) =>
  (program?.phases || [])
    .filter((phase) => phase && phase.visibility !== 'internal' && phase.title)
    .map((phase) => ({
      title: latin(phase.title),
      start: phase.start || '',
      end: phase.end || '',
      activities: (phase.activities || [])
        .filter((item) => item && item.visibility !== 'internal' && item.title)
        .map((item) => ({
          title: latin(item.title),
          detail: item.detail && !sameWords(item.detail, item.title) ? latin(item.detail) : '',
          start: item.start || '',
          end: item.end || '',
        })),
    }))

export const pdfScript = (program) => {
  const phases = publicPhases(program)
  const lines = [campaignTitle(program)]
  if (program?.slug === 'childrens-day' && program.title) lines.push(latin(program.title))
  ;['organizer', 'summary', 'eventDate', 'location', 'parentInfo'].forEach((key) => {
    if (program?.[key]) lines.push(latin(program[key]))
  })
  phases.forEach((phase) => {
    lines.push(phase.title)
    const when = span(phase.start, phase.end)
    if (when) lines.push(when)
    phase.activities.forEach((item) => {
      lines.push(item.title)
      const slot = span(item.start, item.end)
      if (slot) lines.push(slot)
      if (item.detail) lines.push(item.detail)
    })
  })
  return lines.filter(Boolean)
}

const wrap = (font, text, size, width) => {
  const words = latin(text).split(' ').filter(Boolean)
  const lines = []
  let line = ''
  words.forEach((word) => {
    const trial = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(trial, size) <= width) line = trial
    else {
      if (line) lines.push(line)
      line = word
    }
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

const fit = (font, text, size, width) => {
  const value = latin(text)
  if (!value || font.widthOfTextAtSize(value, size) <= width) return value
  let out = value
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > width) out = out.slice(0, -1)
  return `${out.trim()}...`
}

const track = (page, font, text, x, y, size, color, gap) => {
  let cursor = x
  ;[...text].forEach((char) => {
    page.drawText(char, { x: cursor, y, size, font, color })
    cursor += font.widthOfTextAtSize(char, size) + gap
  })
  return cursor
}

const clocks = (phases) =>
  phases
    .flatMap((phase) => [phase.start, phase.end, ...phase.activities.flatMap((item) => [item.start, item.end])])
    .filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    .sort()

const pngBytes = async (url) => {
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 0,
    width: 280,
    errorCorrectionLevel: 'M',
    color: { dark: '#050605', light: '#ffffff' },
  })
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

const measure = (phases, fonts) => {
  const bodyWidth = PAGE_W - RAIL - M
  return phases.map((phase, index) => {
    const titleLines = wrap(fonts.display, phase.title, 15, bodyWidth - 86)
    const activities = phase.activities.map((item) => {
      const titleLines = wrap(fonts.medium, item.title, 10.5, bodyWidth - 4)
      const detailLines = item.detail ? wrap(fonts.regular, item.detail, 8.5, bodyWidth - 4) : []
      return { ...item, titleLines, detailLines, height: 4 + titleLines.length * 12.5 + detailLines.length * 10.5 }
    })
    return {
      ...phase,
      index,
      titleLines,
      activities,
      titleHeight: 12 + titleLines.length * 16,
      height: 20 + titleLines.length * 17 + activities.reduce((sum, item) => sum + item.height, 0),
    }
  })
}

export const buildEventProgramPdf = async ({ program, url, fonts, labels = {} }) => {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(fonts.regular, { subset: true })
  const medium = await doc.embedFont(fonts.medium, { subset: true })
  const display = await doc.embedFont(fonts.display, { subset: true })
  const faces = { regular, medium, display }
  const laid = measure(publicPhases(program), faces)
  const qr = await doc.embedPng(await pngBytes(url))
  const title = campaignTitle(program)
  const subtitle = program?.slug === 'childrens-day' ? latin(program.title) : ''
  const organizer = latin(program?.organizer || 'The Brotherhood').toUpperCase()
  const summary = latin(program?.summary)
  const parentInfo = latin(program?.parentInfo)
  const facts = [program?.eventDate, latin(program?.location)].filter(Boolean)
  const range = clocks(laid)
  const windowLabel = range.length > 1 && range[0] !== range[range.length - 1] ? `${range[0]} - ${range[range.length - 1]}` : range[0] || ''
  const updated = program?.publicUpdatedAt
    ? new Date(program.publicUpdatedAt).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: program.timeZone || 'Africa/Casablanca',
      })
    : ''
  const official = labels.official || 'Programme officiel'
  const scan = labels.scan || 'Scanner pour ouvrir le programme'
  const presents = labels.presents || 'PR\u00c9SENTE'
  const parents = labels.parents || 'Pour les parents'
  const continued = labels.continued || 'Suite'
  const updatedLabel = labels.updated || 'Mis \u00e0 jour'

  doc.setTitle(subtitle ? `${title} - ${subtitle}` : title)
  doc.setAuthor(latin(program?.organizer || 'The Brotherhood'))

  let page = null
  let y = 0
  let pageNo = 0

  const openPage = (compact) => {
    page = doc.addPage([PAGE_W, PAGE_H])
    pageNo += 1
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER })
    if (compact) {
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_NEXT, width: PAGE_W, height: HEADER_NEXT, color: INK })
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_NEXT, width: PAGE_W, height: 3, color: RED })
      page.drawText(title, { x: M, y: PAGE_H - 34, size: 16, font: display, color: WHITE })
      page.drawText(continued.toUpperCase(), { x: PAGE_W - M - medium.widthOfTextAtSize(continued.toUpperCase(), 8), y: PAGE_H - 30, size: 8, font: medium, color: RED })
      y = PAGE_H - HEADER_NEXT - 22
      return
    }

    page.drawRectangle({ x: 0, y: PAGE_H - HEADER, width: PAGE_W, height: HEADER, color: INK })
    page.drawRectangle({ x: 0, y: PAGE_H - HEADER, width: PAGE_W, height: 5, color: RED })
    page.drawRectangle({ x: M, y: PAGE_H - 30, width: 8, height: 8, color: RED })
    const afterName = track(page, medium, organizer, M + 16, PAGE_H - 28, 8, WHITE, 1.15)
    track(page, medium, presents, afterName + 12, PAGE_H - 28, 8, RED, 1.15)
    const headline = title === "CHILDREN'S DAY" ? ["CHILDREN'S", 'DAY'] : wrap(display, title, 28, PAGE_W - M * 2 - 120)
    let size = title === "CHILDREN'S DAY" ? 36 : 28
    const widest = headline.reduce((max, line) => Math.max(max, display.widthOfTextAtSize(line, size)), 0)
    if (widest > PAGE_W - M * 2 - 108) size *= (PAGE_W - M * 2 - 108) / widest
    headline.forEach((line, index) => {
      page.drawText(line, { x: M, y: PAGE_H - 72 - index * (size * 0.86), size, font: display, color: WHITE })
    })
    if (subtitle) page.drawText(subtitle, { x: M, y: PAGE_H - 78 - headline.length * (size * 0.86) - 6, size: 12, font: regular, color: rgb(0.9, 0.9, 0.88) })
    page.drawCircle({ x: PAGE_W - 72, y: PAGE_H - 86, size: 30, borderColor: rgb(1, 1, 1), borderWidth: 0.7, opacity: 0.45 })
    page.drawCircle({ x: PAGE_W - 72, y: PAGE_H - 86, size: 16, borderColor: RED, borderWidth: 1.4 })
    if (windowLabel) {
      const labelWidth = medium.widthOfTextAtSize(windowLabel, 8)
      page.drawText(windowLabel, { x: PAGE_W - 72 - labelWidth / 2, y: PAGE_H - 132, size: 8, font: medium, color: WHITE })
    }
    y = PAGE_H - HEADER - 20
  }

  const rule = () => {
    page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 0.4, color: rgb(0.82, 0.83, 0.81) })
    y -= 10
  }

  openPage(false)

  if (laid.length) {
    const col = (PAGE_W - M * 2) / laid.length
    laid.forEach((phase, index) => {
      const x = M + index * col
      page.drawText(span(phase.start, phase.end) || phase.start || '', { x, y, size: 8, font: medium, color: RED })
      page.drawText(fit(regular, phase.title, 8, col - 8), { x, y: y - 12, size: 8, font: regular, color: INK })
    })
    y -= 26
    rule()
  }

  if (facts.length || summary) {
    if (facts.length) {
      page.drawText(facts.join('   ·   '), { x: M, y, size: 9, font: medium, color: INK })
      y -= 16
    }
    if (summary) {
      wrap(regular, summary, 9.5, PAGE_W - M * 2).forEach((line) => {
        page.drawText(line, { x: M, y, size: 9.5, font: regular, color: MUTED })
        y -= 13
      })
      y -= 6
    }
  }

  const room = () => y - (FOOTER + 16)

  laid.forEach((phase) => {
    const drawHeading = () => {
      page.drawCircle({ x: RAIL - 14, y: y + 4, size: 3.1, color: RED })
      page.drawText(String(phase.index + 1).padStart(2, '0'), { x: M, y: y - 2, size: 10, font: medium, color: RED })
      phase.titleLines.forEach((line, index) => {
        page.drawText(line, { x: RAIL, y: y - index * 17, size: 15, font: display, color: INK })
      })
      const when = span(phase.start, phase.end)
      if (when) page.drawText(when, { x: PAGE_W - M - medium.widthOfTextAtSize(when, 10), y, size: 10, font: medium, color: INK })
      y -= phase.titleHeight
    }
    if (room() < phase.titleHeight + (phase.activities[0]?.height || 0)) openPage(true)
    drawHeading()
    phase.activities.forEach((item) => {
      if (room() < item.height) {
        openPage(true)
        drawHeading()
      }
      const when = span(item.start, item.end)
      page.drawText(when, { x: M, y: y - 1, size: 8.5, font: medium, color: RED })
      item.titleLines.forEach((line, index) => {
        page.drawText(line, { x: RAIL, y: y - index * 12.5, size: 10.5, font: medium, color: INK })
      })
      item.detailLines.forEach((line, index) => {
        page.drawText(line, { x: RAIL, y: y - item.titleLines.length * 12.5 - 1 - index * 10.5, size: 8.5, font: regular, color: MUTED })
      })
      y -= item.height
    })
    y -= 4
    if (room() > 10) rule()
  })

  if (parentInfo) {
    const lines = wrap(regular, parentInfo, 9, PAGE_W - M * 2 - 16)
    const box = 18 + lines.length * 12
    if (room() < box) openPage(true)
    page.drawRectangle({ x: M, y: y - box + 12, width: 3, height: box - 8, color: RED })
    page.drawText(parents.toUpperCase(), { x: M + 12, y, size: 8, font: medium, color: RED })
    lines.forEach((line, index) => page.drawText(line, { x: M + 12, y: y - 14 - index * 12, size: 9, font: regular, color: INK }))
    y -= box
  }

  if (updated) {
    if (room() < 16) openPage(true)
    page.drawText(`${updatedLabel}  ${updated}`, { x: M, y, size: 8, font: regular, color: MUTED })
  }

  const total = doc.getPageCount()
  doc.getPages().forEach((printed, index) => {
    page = printed
    pageNo = index + 1
    const stamp = `${pageNo}  /  ${total}`
    printed.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: FOOTER, color: INK })
    printed.drawRectangle({ x: 16, y: 12, width: 46, height: 46, color: WHITE })
    printed.drawImage(qr, { x: 18, y: 14, width: 42, height: 42 })
    printed.drawText(official.toUpperCase(), { x: 74, y: 40, size: 8, font: medium, color: WHITE })
    printed.drawText(fit(regular, scan, 8, 280), { x: 74, y: 26, size: 8, font: regular, color: rgb(0.78, 0.78, 0.76) })
    printed.drawText(fit(regular, url, 7.5, 300), { x: 74, y: 14, size: 7.5, font: regular, color: rgb(0.62, 0.62, 0.6) })
    printed.drawText(stamp, { x: PAGE_W - M - medium.widthOfTextAtSize(stamp, 8), y: 28, size: 8, font: medium, color: WHITE })
  })

  return doc.save()
}

export const downloadEventProgram = async ({ program, url }) => {
  const [regular, medium, display] = await Promise.all(
    ['/fonts/Inter-Regular.ttf', '/fonts/Inter-Medium.ttf', '/fonts/InterTight-SemiBold.ttf'].map(async (path) => {
      const response = await fetch(path)
      if (!response.ok) throw new Error('font')
      return new Uint8Array(await response.arrayBuffer())
    }),
  )
  const bytes = await buildEventProgramPdf({
    program,
    url,
    fonts: { regular, medium, display },
    labels: {
      official: 'Programme officiel',
      scan: 'Scanner pour ouvrir le programme',
      presents: 'PR\u00c9SENTE',
      parents: 'Pour les parents',
      continued: 'Suite',
      updated: 'Mis \u00e0 jour',
    },
  })
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = `${program?.slug || 'programme'}-programme.pdf`
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
