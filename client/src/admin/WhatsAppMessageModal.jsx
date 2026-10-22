import { useEffect, useRef, useState } from 'react'
import { adminApi } from './api'
import { fullName } from './format'
import { CheckIcon, CloseIcon, CopyIcon, WhatsAppIcon } from './icons'
import { useAdminText } from './strings'
import {
  approvedGroupMessage,
  isValidWhatsAppPhone,
  isWhatsAppGroupUrl,
  memberWhatsAppPhone,
  messageLocale,
  normalizeWhatsAppDigits,
  openWhatsApp,
} from './whatsapp'

/**
 * Editable WhatsApp workflow for approved members.
 * Opening WhatsApp never means the message was sent — the admin must press Send in WhatsApp.
 */
export const WhatsAppMessageModal = ({ items, initialGroupLink = '', canSaveLink = false, onClose, onPrepared }) => {
  const a = useAdminText()
  const dialogRef = useRef(null)
  const queue = items?.length ? items : []
  const [index, setIndex] = useState(0)
  const item = queue[index] || null
  const [groupLink, setGroupLink] = useState(initialGroupLink || '')
  const [phone, setPhone] = useState('')
  const [draft, setDraft] = useState('')
  const [edited, setEdited] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [savingLink, setSavingLink] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])

  useEffect(() => {
    if (!item) return
    setPhone(memberWhatsAppPhone(item))
    setDraft(approvedGroupMessage(item, groupLink.trim()))
    setEdited(false)
    setNotice('')
    setError('')
    setCopied(false)
    // Intentionally rebuild when the member changes; group link is applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, index])

  useEffect(() => {
    if (!item || edited) return
    setDraft(approvedGroupMessage(item, groupLink.trim()))
  }, [groupLink, item, edited])

  if (!item) return null

  const template = approvedGroupMessage(item, groupLink.trim())

  const restore = () => {
    setDraft(approvedGroupMessage(item, groupLink.trim()))
    setEdited(false)
    setError('')
    setNotice('restored')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setNotice('copied')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError(a('whatsapp.copyFailed'))
    }
  }

  const saveDefaultLink = async () => {
    if (!canSaveLink) return
    const link = groupLink.trim()
    if (link && !isWhatsAppGroupUrl(link)) {
      setError(a('whatsapp.invalidGroup'))
      return
    }
    setSavingLink(true)
    setError('')
    try {
      await adminApi.saveWhatsAppDefaults({ whatsappGroupUrl: link })
      setNotice('linkSaved')
    } catch (err) {
      setError(a(err.status === 403 ? 'whatsapp.saveForbidden' : 'whatsapp.saveFailed'))
    } finally {
      setSavingLink(false)
    }
  }

  const open = async () => {
    setError('')
    setNotice('')
    const link = groupLink.trim()
    if (link && !isWhatsAppGroupUrl(link)) {
      setError(a('whatsapp.invalidGroup'))
      return
    }
    if (!draft.trim()) {
      setError(a('whatsapp.emptyMessage'))
      return
    }
    const digits = normalizeWhatsAppDigits(phone)
    if (phone.trim() && !isValidWhatsAppPhone(phone)) {
      setError(a('whatsapp.invalidPhone'))
      return
    }
    setBusy(true)
    try {
      if (digits) {
        const opened = openWhatsApp(digits, draft)
        setNotice(opened ? 'opened' : 'blocked')
      } else {
        try {
          await navigator.clipboard.writeText(draft)
          setNotice('noPhoneOpen')
        } catch {
          setNotice('noPhone')
        }
        openWhatsApp('', draft)
      }
      try {
        const data = await adminApi.openWhatsApp(item.id, draft, Boolean(item.whatsapp?.openedAt))
        onPrepared?.(data.item || item)
      } catch (err) {
        if (err.status === 409 && err.body?.error === 'already') {
          try {
            const data = await adminApi.openWhatsApp(item.id, draft, true)
            onPrepared?.(data.item || item)
          } catch {
            /* audit is best-effort */
          }
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const bulk = queue.length > 1

  return (
    <dialog
      ref={dialogRef}
      className="adm-confirm adm-wa-modal"
      aria-labelledby="adm-wa-modal-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="adm-confirm-card adm-wa-modal-card">
        <header className="adm-wa-modal-head">
          <span className="adm-confirm-icon" aria-hidden="true">
            <WhatsAppIcon size={18} />
          </span>
          <div>
            <h2 id="adm-wa-modal-title">{a('whatsapp.modalTitle')}</h2>
            <p className="adm-wa-modal-sub">
              {fullName(item)}
              {bulk ? ` · ${a('whatsapp.bulkProgress', { current: index + 1, total: queue.length })}` : ''}
            </p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label={a('whatsapp.cancel')}>
            <CloseIcon />
          </button>
        </header>

        <p className="adm-wa-disclaimer" role="note">
          {a('whatsapp.disclaimer')}
        </p>

        <label className="adm-wa-label" htmlFor="adm-wa-group">
          {a('whatsapp.groupLink')}
        </label>
        <input
          id="adm-wa-group"
          className="adm-wa-input"
          dir="ltr"
          type="url"
          placeholder="https://chat.whatsapp.com/…"
          value={groupLink}
          onChange={(event) => setGroupLink(event.target.value)}
          aria-invalid={groupLink.trim() && !isWhatsAppGroupUrl(groupLink) ? 'true' : undefined}
        />
        <p className="adm-wa-hint">{a('whatsapp.groupHint')}</p>
        {canSaveLink ? (
          <button type="button" className="adm-link" disabled={savingLink} onClick={saveDefaultLink}>
            {savingLink ? a('whatsapp.savingLink') : a('whatsapp.saveLink')}
          </button>
        ) : null}

        <label className="adm-wa-label" htmlFor="adm-wa-phone">
          {a('whatsapp.to')}
        </label>
        <input
          id="adm-wa-phone"
          className="adm-wa-input"
          dir="ltr"
          inputMode="tel"
          placeholder="+2126…"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-invalid={phone.trim() && !isValidWhatsAppPhone(phone) ? 'true' : undefined}
        />
        {!phone.trim() ? <p className="adm-wa-hint">{a('whatsapp.phoneMissing')}</p> : null}

        <label className="adm-wa-label" htmlFor="adm-wa-draft">
          {a('whatsapp.message')}
        </label>
        <textarea
          id="adm-wa-draft"
          className="adm-wa-message"
          dir={messageLocale(item) === 'ar' ? 'rtl' : 'ltr'}
          rows={11}
          maxLength={1500}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setEdited(true)
          }}
        />
        <p className="adm-wa-hint">
          <button type="button" className="adm-link" onClick={restore}>
            {a('whatsapp.restore')}
          </button>
          {edited && draft !== template ? <span>{a('whatsapp.edited')}</span> : null}
        </p>

        <div className="adm-wa-preview" aria-live="polite">
          <p className="adm-wa-preview-label">{a('whatsapp.preview')}</p>
          <pre dir={messageLocale(item) === 'ar' ? 'rtl' : 'ltr'}>{draft}</pre>
        </div>

        {error ? (
          <p className="adm-alert" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className={`adm-wa-notice is-${notice}`} role="status">
            {a(`whatsapp.${notice}`)}
          </p>
        ) : null}

        <div className="adm-confirm-actions adm-wa-modal-actions">
          {bulk ? (
            <>
              <button type="button" className="btn btn-sm btn-ghost" disabled={index <= 0} onClick={() => setIndex((n) => n - 1)}>
                {a('whatsapp.prev')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={index >= queue.length - 1}
                onClick={() => setIndex((n) => n + 1)}
              >
                {a('whatsapp.next')}
              </button>
            </>
          ) : null}
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            {a('whatsapp.cancel')}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? a('whatsapp.copied') : a('whatsapp.copy')}</span>
          </button>
          <button type="button" className="btn btn-sm btn-primary adm-wa-send" disabled={busy} onClick={open}>
            <WhatsAppIcon />
            <span>{busy ? '…' : a('whatsapp.open')}</span>
          </button>
        </div>
      </div>
    </dialog>
  )
}
