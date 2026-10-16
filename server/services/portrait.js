import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads/portraits')
const NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/i

export const portraitFile = (name) => {
  if (!NAME.test(name || '')) return null
  const file = path.resolve(DIR, name)
  return file.startsWith(`${DIR}${path.sep}`) ? file : null
}

export const savePortrait = async (id, photo) => {
  const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
  const name = `${id}.${ext}`
  await mkdir(DIR, { recursive: true })
  await writeFile(path.join(DIR, name), photo.buffer)
  return name
}
