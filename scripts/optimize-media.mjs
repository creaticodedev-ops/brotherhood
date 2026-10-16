import { createRequire } from 'node:module'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../client/package.json', import.meta.url))
const sharp = require('sharp')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = 'C:/Users/zakar/.cursor/projects/c-Users-zakar-Desktop-brotherhood/assets'
const outDir = path.join(root, 'client/public/media')
const brandDir = path.join(root, 'client/src/assets/brand')
const publicDir = path.join(root, 'client/public')

const map = {
  d58b2af5: 'clinic-group',
  '2304935f': 'night-gathering',
  '18510e2a': 'beach-fire',
  a42589c5: 'sheep-street',
  '4e50efd1': 'pool-night',
  ef0bb2bf: 'birthday',
  '7cbcd9a0': 'screening',
  '138cab5d': 'pool-day',
  '4e61e420': 'sheep-walk',
  ea608d51: 'gift-bags',
  '15e33600': 'polo',
  '50903a71': 'neighborhood',
  b85be4d1: 'circle-clap',
  '4530fa41': 'safi-heart',
  d8b8c98f: 'boxes-grass',
  '12880ca3': 'stage-speaker',
  '536e3574': 'awards-table',
  '94df3c6e': 'lantern-circle',
  '0d98f82d': 'award-stage',
  '280bb77a': 'kids-show',
  '0ba88ca0': 'courtyard-meal',
  '24a8051e': 'mountain-aid',
  '14d2120c': 'yellow-room',
  '240ca490': 'room-window',
  '1c797a1c': 'boys-banners',
  '43bca892': 'flour-bags',
  f1b36f72: 'truck-unload',
  '41a500d2': 'tent-frame',
  '002039cc': 'enlightened-wide',
  e4c23029: 'sports-team',
  '2e548169': 'blankets',
  '91dede5a': 'color-bags',
  '5619c7d0': 'night-meal',
  '59d39bec': 'sorting-bags',
  '72c2747b': 'village-rows',
  '92f76f1d': 'playground',
  '0f68cd5f': 'warmth-group',
  '649f1f8b': 'enlightened-words',
  '0b646efa': 'village-celebration',
  '49a66f54': 'tent-meal',
  '4fffb832': 'iftar-120',
  '8a05675f': 'logo',
}

await mkdir(outDir, { recursive: true })
await mkdir(brandDir, { recursive: true })

const files = await readdir(srcDir)
const used = new Set()

for (const file of files) {
  const hit = Object.entries(map).find(([id]) => file.includes(`-${id}-`) || file.includes(`-${id}.`))
  if (!hit) {
    console.log('UNMAPPED', file)
    continue
  }
  used.add(hit[0])
  const destName = hit[1]
  const input = path.join(srcDir, file)
  if (destName === 'logo') {
    const png = path.join(outDir, 'logo.png')
    await sharp(input).resize({ width: 1400, withoutEnlargement: true }).png().toFile(png)
    await copyFile(png, path.join(brandDir, 'brotherhood-logo.png'))
    const icon = (size, name) =>
      sharp(input).resize(size, size, { fit: 'contain', background: '#09090b' }).png().toFile(path.join(publicDir, name))
    await icon(32, 'favicon-32x32.png')
    await icon(180, 'apple-touch-icon.png')
    await icon(192, 'icon-192.png')
    await icon(512, 'icon-512.png')
    await sharp(input).resize(1200, 630, { fit: 'contain', background: '#09090b' }).png().toFile(path.join(publicDir, 'og-image.png'))
    console.log('logo ok')
    continue
  }
  const info = await sharp(input)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(path.join(outDir, `${destName}.jpg`))
  console.log(destName, info.width, info.height, `${Math.round(info.size / 1024)}kb`)
}

const missing = Object.keys(map).filter((id) => !used.has(id))
if (missing.length) {
  console.log('MISSING', missing.join(', '))
  process.exit(1)
}
