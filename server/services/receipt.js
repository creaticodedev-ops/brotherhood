import { PaymentReceipt, RECEIPT_TYPES } from '../models/PaymentReceipt.js'

export const RECEIPT_LIMIT = 5_000_000
const ID = /^[a-f0-9]{24}$/i

const asBuffer = (value) => {
  if (Buffer.isBuffer(value)) return value
  if (value?.buffer) return Buffer.from(value.buffer)
  return Buffer.from(value || [])
}

export const receiptSignatureOk = (type, buffer) => {
  if (!buffer || buffer.length < 5 || buffer.length > RECEIPT_LIMIT) return false
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (type === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  return false
}

export const saveReceipt = async (id, file) => {
  const registration = String(id || '')
  if (!ID.test(registration) || !RECEIPT_TYPES.includes(file?.type) || !receiptSignatureOk(file.type, file.buffer)) {
    throw Object.assign(new Error('Invalid receipt'), { status: 422, expose: 'Invalid receipt' })
  }
  await PaymentReceipt.findOneAndUpdate(
    { registration },
    {
      $set: {
        contentType: file.type,
        data: file.buffer,
        bytes: file.buffer.length,
        originalName: String(file.name || '').slice(0, 180),
      },
    },
    { upsert: true },
  )
  return { contentType: file.type, bytes: file.buffer.length, originalName: String(file.name || '').slice(0, 180) }
}

export const readReceipt = async (id) => {
  const registration = String(id || '')
  if (!ID.test(registration)) return null
  const doc = await PaymentReceipt.findOne({ registration }).select('contentType data bytes originalName').lean()
  if (!doc) return null
  const data = asBuffer(doc.data)
  if (!receiptSignatureOk(doc.contentType, data)) return null
  return { contentType: doc.contentType, data, bytes: doc.bytes, originalName: doc.originalName || '' }
}

export const removeReceipt = async (id) => {
  const registration = String(id || '')
  if (!ID.test(registration)) return
  await PaymentReceipt.deleteOne({ registration })
}
