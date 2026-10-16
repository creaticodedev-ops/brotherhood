/**
 * Builds web-ready brand assets from the official US Bonds logo.
 * The logo artwork itself is never altered: assets are only trimmed of
 * transparent padding, resized, or (for icons) cropped to the "UD" mark.
 *
 * Usage: node scripts/generate-brand-assets.mjs [path/to/official-logo.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.resolve(process.argv[2] || path.join(root, 'brand/usbonds-logo-official.png'))
const brandOut = path.join(root, 'src/assets/brand')
const publicOut = path.join(root, 'public')
const BLACK = { r: 5, g: 6, b: 5, alpha: 1 }

fs.mkdirSync(brandOut, { recursive: true })
fs.mkdirSync(publicOut, { recursive: true })

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const columns = new Array(info.width).fill(false)
let top = info.height
let bottom = 0
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 24) {
      columns[x] = true
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
}
const left = columns.indexOf(true)
const right = columns.lastIndexOf(true)
// The "UD" mark is the first continuous run of opaque columns.
let markRight = left
while (markRight + 1 < info.width && columns[markRight + 1]) markRight += 1

const pad = 2
const full = {
  left: Math.max(0, left - pad),
  top: Math.max(0, top - pad),
  width: Math.min(info.width, right + pad + 1) - Math.max(0, left - pad),
  height: Math.min(info.height, bottom + pad + 1) - Math.max(0, top - pad),
}
const mark = { left, top, width: markRight - left + 1, height: bottom - top + 1 }

const logo = sharp(source).extract(full)
await logo.clone().png({ compressionLevel: 9 }).toFile(path.join(brandOut, 'usbonds-logo.png'))
await logo.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(brandOut, 'usbonds-logo.webp'))
await logo.clone().resize({ height: 96 }).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(brandOut, 'usbonds-logo-96.webp'))

const icon = async (size, file, padding = 0.14) => {
  const inner = Math.round(size * (1 - padding * 2))
  const markPng = await sharp(source)
    .extract(mark)
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BLACK } })
    .composite([{ input: markPng, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicOut, file))
}

await icon(32, 'favicon-32x32.png', 0.08)
await icon(180, 'apple-touch-icon.png')
await icon(192, 'icon-192.png')
await icon(512, 'icon-512.png')

const og = await sharp(source).extract(full).resize({ width: 760 }).png().toBuffer()
await sharp({ create: { width: 1200, height: 630, channels: 4, background: BLACK } })
  .composite([{ input: og, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicOut, 'og-image.png'))

console.log('Brand assets generated', { full, mark })
