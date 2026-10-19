import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { formatDateTime } from './format'
import { CheckIcon, CopyIcon, WhatsAppIcon } from './icons'
import { useAdminText } from './strings'
import { finalizeInviteMessage, openWhatsApp } from './whatsapp'

const PIPELINE_ORDER = [
  'received',
  'approved',
  'link_generated',
  'info_complete',
  'terms_accepted',
  'payment_pending',
  'payment_rejected',
  'activated',
]

export const FinalizePanel = ({ item, onUpdated }) => {
  const a = useAdminText()
  const { locale } = useI18n()
  const fin = item.finalization || {}
  const when = (value) => (value ? formatDateTime(value, locale) : '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  if (item.kind !== 'membership') return null

  const canGenerate = ['approved', 'finalizing', 'payment_review', 'active'].includes(item.status)
  const phone = fin.whatsapp || item.phone

  const run = async (key, action) => {
    setBusy(key)
    setError('')
    try {
      const data = await action()
      onUpdated(data)
    } catch (err) {
      setError(a(err.status === 409 ? 'finalize.conflict' : 'finalize.error'))
    } finally {
      setBusy('')
    }
  }

  const generate = () => run('generate', () => adminApi.generateFinalizeLink(item.id))

  const revoke = () => run('revoke', () => adminApi.revokeFinalizeLink(item.id))

  const sendWhatsApp = () => {
    if (!fin.linkUrl || !phone) return
    const message = finalizeInviteMessage(item, fin.linkUrl)
    const opened = openWhatsApp(phone, message)
    adminApi.openWhatsApp(item.id, message, Boolean(item.whatsapp?.openedAt)).catch(() => {})
    if (!opened) setError(a('whatsapp.blocked'))
  }

  const copyLink = async () => {
    if (!fin.linkUrl) return
    try {
      await navigator.clipboard.writeText(fin.linkUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError(a('finalize.error'))
    }
  }

  const confirm = () => run('confirm', () => adminApi.confirmPayment(item.id))

  const reject = async () => {
    if (rejectReason.trim().length < 3) {
      setError(a('finalize.rejectRequired'))
      return
    }
    await run('reject', () => adminApi.rejectPayment(item.id, rejectReason.trim()))
    setShowReject(false)
    setRejectReason('')
  }

  return (
    <section className="adm-block adm-finalize" aria-labelledby="adm-finalize-title">
      <h3 id="adm-finalize-title">{a('finalize.title')}</h3>
      <p className="adm-muted">{a('finalize.lead')}</p>

      <div className="adm-finalize-pipeline" role="list">
        {PIPELINE_ORDER.map((key) => (
          <span key={key} role="listitem" className={`adm-finalize-chip${item.pipeline === key ? ' is-current' : ''}`}>
            {a(`finalize.pipeline.${key}`)}
          </span>
        ))}
      </div>

      <dl className="adm-facts">
        <div>
          <dt>{a('finalize.pipelineLabel')}</dt>
          <dd>{a(`finalize.pipeline.${item.pipeline || 'received'}`)}</dd>
        </div>
        {fin.instagram ? (
          <div>
            <dt>{a('finalize.instagram')}</dt>
            <dd>
              <a href={fin.instagram} target="_blank" rel="noopener noreferrer" dir="ltr">
                {fin.instagram}
              </a>
            </dd>
          </div>
        ) : null}
        {fin.whatsapp ? (
          <div>
            <dt>{a('finalize.whatsapp')}</dt>
            <dd dir="ltr">{fin.whatsapp}</dd>
          </div>
        ) : null}
        {fin.termsAcceptedAt ? (
          <div>
            <dt>{a('finalize.terms')}</dt>
            <dd>
              {a('finalize.termsMeta', { version: fin.termsVersion || '—', date: when(fin.termsAcceptedAt) })}
            </dd>
          </div>
        ) : null}
        {fin.paymentStatus && fin.paymentStatus !== 'none' ? (
          <div>
            <dt>{a('finalize.payment')}</dt>
            <dd>{a(`finalize.paymentStatus.${fin.paymentStatus}`)}</dd>
          </div>
        ) : null}
        {fin.paymentRejectReason ? (
          <div>
            <dt>{a('finalize.rejectReason')}</dt>
            <dd>{fin.paymentRejectReason}</dd>
          </div>
        ) : null}
      </dl>

      <div className="adm-actions">
        {canGenerate ? (
          <button type="button" className="btn btn-sm btn-primary" disabled={Boolean(busy)} onClick={generate}>
            {busy === 'generate' ? '…' : fin.hasLink ? a('finalize.regenerate') : a('finalize.generate')}
          </button>
        ) : null}
        {fin.hasLink && fin.linkUrl ? (
          <>
            <button type="button" className="btn btn-sm btn-primary adm-wa-send" disabled={!phone} onClick={sendWhatsApp}>
              <WhatsAppIcon />
              <span>{a('finalize.sendWhatsApp')}</span>
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={copyLink}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? a('finalize.copied') : a('finalize.copyLink')}</span>
            </button>
            <button type="button" className="btn btn-sm btn-ghost" disabled={Boolean(busy)} onClick={revoke}>
              {busy === 'revoke' ? '…' : a('finalize.revoke')}
            </button>
          </>
        ) : null}
      </div>

      {fin.linkUrl ? (
        <p className="adm-finalize-link" dir="ltr">
          <small>{a('finalize.link')}</small>
          <code>{fin.linkUrl}</code>
          {fin.expiresAt ? <small>{a('finalize.expires', { date: when(fin.expiresAt) })}</small> : null}
        </p>
      ) : null}

      {fin.hasReceipt ? (
        <div className="adm-finalize-receipt">
          <a className="btn btn-sm btn-ghost" href={`/api/admin/registrations/${item.id}/receipt`} target="_blank" rel="noopener noreferrer">
            {a('finalize.openReceipt')}
          </a>
          {fin.paymentStatus === 'pending' ? (
            <>
              <button type="button" className="btn btn-sm btn-primary" disabled={Boolean(busy)} onClick={confirm}>
                {busy === 'confirm' ? '…' : a('finalize.confirmPayment')}
              </button>
              <button type="button" className="btn btn-sm adm-btn-danger" disabled={Boolean(busy)} onClick={() => setShowReject((v) => !v)}>
                {a('finalize.rejectPayment')}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {showReject ? (
        <div className="adm-finalize-reject">
          <label htmlFor="adm-reject-reason">{a('finalize.rejectReason')}</label>
          <textarea
            id="adm-reject-reason"
            className="adm-wa-message"
            rows={3}
            maxLength={500}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <button type="button" className="btn btn-sm adm-btn-danger" disabled={Boolean(busy)} onClick={reject}>
            {busy === 'reject' ? '…' : a('finalize.confirmReject')}
          </button>
        </div>
      ) : null}

      {fin.events?.length ? (
        <ol className="adm-finalize-history">
          {fin.events
            .slice()
            .reverse()
            .slice(0, 12)
            .map((entry, index) => (
              <li key={`${entry.at}-${entry.type}-${index}`}>
                <time dateTime={entry.at}>{when(entry.at)}</time>
                <span>{(() => {
                  const key = `finalize.events.${String(entry.type).replace(/\./g, '_')}`
                  const label = a(key)
                  return label === key ? entry.type : label
                })()}</span>
                {entry.actor ? <small>{entry.actor}</small> : null}
              </li>
            ))}
        </ol>
      ) : null}

      {error ? (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
