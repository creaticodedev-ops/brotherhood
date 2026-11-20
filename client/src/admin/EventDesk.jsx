import { useEffect, useMemo, useRef, useState } from 'react'
import { TEAMS } from '../../../shared/eventProgram.js'
import { publicUrl } from '../config/site'
import { adminApi } from './api'
import { prepareEventPoster } from './preparePoster'
import { useI18n } from '../i18n/I18nProvider'
import './eventDesk.css'

const COPY = {
  fr: {
    kicker: 'Événement',
    title: 'Centre de l’événement',
    lead: 'Le programme public, la coordination de l’équipe et le contrôle de publication.',
    staffTitle: 'Coordination',
    staffLead: 'Ce qui est à faire, qui s’en charge, et ce qui arrive.',
    program: 'Programme',
    operations: 'Opérations',
    day: 'Mode jour J',
    exitDay: 'Vue complète',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Enregistré.',
    confirmPublic: 'Ce changement sera visible sur la page publique. Continuer ?',
    publish: 'Publier',
    unpublish: 'Retirer',
    archive: 'Archiver',
    duplicate: 'Dupliquer',
    preview: 'Aperçu',
    open: 'Page publique',
    mine: 'Mes tâches',
    allTasks: 'Toutes les tâches',
    notices: 'Annonces',
    checks: 'Liste, une ligne par point',
    addTask: 'Ajouter une tâche',
    addNotice: 'Publier l’annonce',
    ack: 'J’ai vu',
    acked: 'Pris en compte',
    status: { todo: 'À faire', progress: 'En cours', blocked: 'Bloqué', done: 'Terminé' },
    priority: { normal: 'Normale', high: 'Haute', urgent: 'Urgente' },
    days: { friday: 'Vendredi', saturday: 'Samedi', event: 'Jour J', after: 'Après' },
    teams: { reception: 'Accueil', entertainment: 'Animation', workshops: 'Ateliers', logistics: 'Logistique', gifts: 'Cadeaux', photography: 'Photo', dismantling: 'Démontage' },
    fields: { title: 'Titre', organizer: 'Organisateur', date: 'Date', location: 'Lieu', summary: 'Résumé', parents: 'Informations parents', banner: 'Image', phase: 'Phase', activity: 'Activité', start: 'Début', end: 'Fin', visibility: 'Visibilité', team: 'Équipe', assignee: 'Responsable', detail: 'Description', notes: 'Note interne', noticeTitle: 'Titre', noticeBody: 'Message' },
    posterTitle: 'Photo / Affiche de l’événement',
    posterLead: 'Cette image est l’affiche publique. Elle s’affiche sur la page et dans le PDF.',
    posterEmpty: 'Aucune affiche pour le moment.',
    posterPending: 'Aperçu — pas encore enregistré.',
    posterSave: 'Enregistrer l’affiche',
    posterRemove: 'Retirer l’affiche',
    posterCancel: 'Annuler l’aperçu',
    posterSaved: 'Affiche enregistrée.',
    posterRemoved: 'Affiche retirée.',
    posterType: 'Ce format n’est pas pris en charge. Utilisez une photo JPEG, PNG ou WebP.',
    posterHeic: 'Cette photo de téléphone n’a pas pu être lue. Enregistrez-la en JPEG, puis réessayez.',
    posterSize: 'Ce fichier est trop volumineux pour être traité. Choisissez une image de 25 Mo ou moins.',
    posterRead: 'Cette image est illisible ou endommagée.',
    posterOptimizing: 'Optimisation de l’image…',
    posterOptimized: 'Image optimisée. Enregistrez pour la publier.',
    posterUploading: 'Envoi de l’affiche…',
    posterError: 'L’affiche n’a pas pu être enregistrée.',
    posterRemoveConfirm: 'Retirer l’affiche de cet événement ?',
    public: 'Public',
    internal: 'Interne',
    until: 'Dans',
    now: 'Activité en cours',
    next: 'Prochaine activité',
    none: 'Rien de plané à cette heure.',
    empty: 'Aucun événement.',
    loadError: 'Chargement impossible.',
    retry: 'Réessayer',
    unsaved: 'Des modifications ne sont pas enregistrées.',
    overlap: 'Ces horaires se chevauchent.',
    remove: 'Retirer',
    up: 'Monter',
    down: 'Descendre',
    addPhase: 'Ajouter une phase',
    addActivity: 'Ajouter une activité',
    stats: { activities: 'Activités', done: 'Tâches terminées', pending: 'Tâches ouvertes', blocked: 'Tâches bloquées' },
  },
  en: {
    kicker: 'Event',
    title: 'Event control',
    lead: 'The public program, team coordination, and publishing.',
    staffTitle: 'Coordination',
    staffLead: 'What to do, who owns it, and what comes next.',
    program: 'Program',
    operations: 'Operations',
    day: 'Event day',
    exitDay: 'Full view',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
    confirmPublic: 'This change will appear on the public page. Continue?',
    publish: 'Publish',
    unpublish: 'Unpublish',
    archive: 'Archive',
    duplicate: 'Duplicate',
    preview: 'Preview',
    open: 'Public page',
    mine: 'My tasks',
    allTasks: 'All tasks',
    notices: 'Announcements',
    checks: 'Checklist, one item per line',
    addTask: 'Add a task',
    addNotice: 'Post announcement',
    ack: 'Seen',
    acked: 'Acknowledged',
    status: { todo: 'To do', progress: 'In progress', blocked: 'Blocked', done: 'Completed' },
    priority: { normal: 'Normal', high: 'High', urgent: 'Urgent' },
    days: { friday: 'Friday', saturday: 'Saturday', event: 'Event day', after: 'After' },
    teams: { reception: 'Reception', entertainment: 'Entertainment', workshops: 'Workshops', logistics: 'Logistics', gifts: 'Gifts', photography: 'Photography', dismantling: 'Dismantling' },
    fields: { title: 'Title', organizer: 'Organizer', date: 'Date', location: 'Location', summary: 'Summary', parents: 'Information for parents', banner: 'Image', phase: 'Phase', activity: 'Activity', start: 'Start', end: 'End', visibility: 'Visibility', team: 'Team', assignee: 'Owner', detail: 'Description', notes: 'Internal note', noticeTitle: 'Title', noticeBody: 'Message' },
    posterTitle: 'Event photo / poster',
    posterLead: 'This is the public poster. It appears on the page and in the PDF.',
    posterEmpty: 'No poster yet.',
    posterPending: 'Preview — not saved yet.',
    posterSave: 'Save poster',
    posterRemove: 'Remove poster',
    posterCancel: 'Cancel preview',
    posterSaved: 'Poster saved.',
    posterRemoved: 'Poster removed.',
    posterType: 'This format is not supported. Use a JPEG, PNG, or WebP photo.',
    posterHeic: 'This phone photo could not be read. Save it as a JPEG, then try again.',
    posterSize: 'This file is too large to process. Choose an image of 25 MB or less.',
    posterRead: 'This image is unreadable or damaged.',
    posterOptimizing: 'Optimizing the image…',
    posterOptimized: 'Image optimized. Save it to publish.',
    posterUploading: 'Uploading the poster…',
    posterError: 'The poster could not be saved.',
    posterRemoveConfirm: 'Remove the poster from this event?',
    public: 'Public',
    internal: 'Internal',
    until: 'In',
    now: 'Current activity',
    next: 'Next activity',
    none: 'Nothing is scheduled at this time.',
    empty: 'No events.',
    loadError: 'Could not load.',
    retry: 'Try again',
    unsaved: 'There are unsaved changes.',
    overlap: 'These times overlap.',
    remove: 'Remove',
    up: 'Move up',
    down: 'Move down',
    addPhase: 'Add a phase',
    addActivity: 'Add an activity',
    stats: { activities: 'Activities', done: 'Completed tasks', pending: 'Open tasks', blocked: 'Blocked tasks' },
  },
  ar: {
    kicker: 'الفعالية',
    title: 'إدارة الفعالية',
    lead: 'البرنامج العام، وتنسيق الفريق، والنشر.',
    staffTitle: 'التنسيق',
    staffLead: 'ما الذي يجب فعله، ومن المسؤول، وما التالي.',
    program: 'البرنامج',
    operations: 'التشغيل',
    day: 'يوم الفعالية',
    exitDay: 'العرض الكامل',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    saved: 'تم الحفظ.',
    confirmPublic: 'سيظهر هذا التغيير في الصفحة العامة. المتابعة؟',
    publish: 'نشر',
    unpublish: 'إلغاء النشر',
    archive: 'أرشفة',
    duplicate: 'نسخ',
    preview: 'معاينة',
    open: 'الصفحة العامة',
    mine: 'مهامي',
    allTasks: 'كل المهام',
    notices: 'الإعلانات',
    checks: 'قائمة، عنصر في كل سطر',
    addTask: 'إضافة مهمة',
    addNotice: 'نشر الإعلان',
    ack: 'اطلعت',
    acked: 'تم التأكيد',
    status: { todo: 'للتنفيذ', progress: 'جارٍ', blocked: 'متوقف', done: 'مكتمل' },
    priority: { normal: 'عادية', high: 'عالية', urgent: 'عاجلة' },
    days: { friday: 'الجمعة', saturday: 'السبت', event: 'يوم الفعالية', after: 'بعدها' },
    teams: { reception: 'الاستقبال', entertainment: 'التنشيط', workshops: 'الورشات', logistics: 'اللوجستيك', gifts: 'الهدايا', photography: 'التصوير', dismantling: 'التفكيك' },
    fields: { title: 'العنوان', organizer: 'الجهة المنظمة', date: 'التاريخ', location: 'المكان', summary: 'الملخص', parents: 'معلومات للآباء', banner: 'صورة', phase: 'المرحلة', activity: 'النشاط', start: 'البداية', end: 'النهاية', visibility: 'الظهور', team: 'الفريق', assignee: 'المسؤول', detail: 'الوصف', notes: 'ملاحظة داخلية', noticeTitle: 'العنوان', noticeBody: 'الرسالة' },
    posterTitle: 'صورة / ملصق الحدث',
    posterLead: 'هذه هي الصورة العامة. تظهر في الصفحة وفي ملف PDF.',
    posterEmpty: 'لا توجد صورة بعد.',
    posterPending: 'معاينة — لم يُحفظ بعد.',
    posterSave: 'حفظ الملصق',
    posterRemove: 'إزالة الملصق',
    posterCancel: 'إلغاء المعاينة',
    posterSaved: 'تم حفظ الملصق.',
    posterRemoved: 'تمت إزالة الملصق.',
    posterType: 'هذا التنسيق غير مدعوم. استخدم صورة JPEG أو PNG أو WebP.',
    posterHeic: 'تعذر قراءة تنسيق الهاتف. احفظ الصورة بصيغة JPEG ثم أعد المحاولة.',
    posterSize: 'هذا الملف أكبر مما يمكن معالجته. اختر صورة بحجم 25 ميغابايت أو أقل.',
    posterRead: 'هذه الصورة تالفة أو غير قابلة للقراءة.',
    posterOptimizing: 'جارٍ تحسين الصورة…',
    posterOptimized: 'تم تحسين الصورة. احفظها لنشرها.',
    posterUploading: 'جارٍ إرسال الملصق…',
    posterError: 'تعذر حفظ الملصق.',
    posterRemoveConfirm: 'إزالة ملصق هذا الحدث؟',
    public: 'عام',
    internal: 'داخلي',
    until: 'بعد',
    now: 'النشاط الحالي',
    next: 'النشاط التالي',
    none: 'لا شيء مجدول في هذا الوقت.',
    empty: 'لا توجد فعاليات.',
    loadError: 'تعذر التحميل.',
    retry: 'إعادة المحاولة',
    unsaved: 'هناك تغييرات غير محفوظة.',
    overlap: 'هذه الأوقات متداخلة.',
    remove: 'حذف',
    up: 'أعلى',
    down: 'أسفل',
    addPhase: 'إضافة مرحلة',
    addActivity: 'إضافة نشاط',
    stats: { activities: 'الأنشطة', done: 'المهام المكتملة', pending: 'المهام المفتوحة', blocked: 'المهام المتوقفة' },
  },
}

const blankActivity = () => ({ key: '', title: '', detail: '', start: '', end: '', team: '', visibility: 'public' })
const blankPhase = () => ({ key: '', day: 'event', title: '', start: '', end: '', visibility: 'public', activities: [blankActivity()] })

export const EventDesk = ({ actor, canManage }) => {
  const { locale } = useI18n()
  const copy = COPY[locale] || COPY.fr
  const [list, setList] = useState([])
  const [currentId, setCurrentId] = useState('')
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(null)
  const [roster, setRoster] = useState([])
  const [tab, setTab] = useState(canManage ? 'program' : 'operations')
  const [dayMode, setDayMode] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [taskDraft, setTaskDraft] = useState({ title: '', detail: '', team: '', day: 'event', start: '', priority: 'normal', assigneeId: '', checklist: '' })
  const [noticeDraft, setNoticeDraft] = useState({ title: '', body: '', urgent: false, requiresAck: true })
  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState('')
  const [posterNote, setPosterNote] = useState('')
  const [posterError, setPosterError] = useState('')
  const [posterPhase, setPosterPhase] = useState('')
  const [posterProgress, setPosterProgress] = useState(0)
  const [posterBusy, setPosterBusy] = useState(false)
  const posterTicket = useRef(0)

  const loadList = () =>
    adminApi.events().then((data) => {
      setList(data.items || [])
      setCurrentId((id) => id || data.items?.[0]?.id || '')
    })

  const loadDetail = (id) => {
    if (!id) return
    adminApi.event(id).then((data) => {
      setDetail(data)
      setForm(data.event)
      setError('')
    }).catch(() => setError(copy.loadError))
  }

  useEffect(() => {
    loadList().catch(() => setError(copy.loadError))
    if (canManage) adminApi.eventRoster().then((data) => setRoster(data.people || [])).catch(() => {})
  }, [canManage, copy.loadError])

  useEffect(() => {
    loadDetail(currentId)
    posterTicket.current += 1
    setPosterFile(null)
    setPosterPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
    setPosterNote('')
    setPosterError('')
    setPosterPhase('')
    setPosterProgress(0)
  }, [currentId])

  useEffect(() => {
    const onLeave = (event) => {
      if (form && detail && JSON.stringify(form) !== JSON.stringify(detail.event)) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [detail, form])

  const dirty = useMemo(() => Boolean(form && detail && JSON.stringify(form) !== JSON.stringify(detail.event)), [detail, form])

  const posterProblem = (error) => copy[{ type: 'posterType', heic: 'posterHeic', size: 'posterSize', read: 'posterRead' }[error?.code]] || copy.posterError

  const clearPosterDraft = () => {
    posterTicket.current += 1
    setPosterFile(null)
    setPosterPhase('')
    setPosterProgress(0)
    setPosterNote('')
    setPosterError('')
    setPosterPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
  }

  const choosePoster = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const ticket = ++posterTicket.current
    const displayable = /image\/(jpeg|jpg|png|webp)/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name || '')
    setPosterFile(null)
    setPosterNote('')
    setPosterError('')
    setPosterProgress(0)
    setPosterPhase('optimizing')
    setPosterPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return displayable ? URL.createObjectURL(file) : ''
    })
    try {
      const prepared = await prepareEventPoster(file)
      if (ticket !== posterTicket.current) return
      if (!displayable) setPosterPreview(URL.createObjectURL(prepared.file))
      setPosterFile(prepared.file)
      setPosterPhase('ready')
      setPosterNote(prepared.optimized ? copy.posterOptimized : copy.posterPending)
    } catch (error) {
      if (ticket !== posterTicket.current) return
      setPosterFile(null)
      setPosterPhase('')
      setPosterError(posterProblem(error))
    }
  }

  const savePoster = async () => {
    if (!posterFile || !form?.id || posterPhase === 'optimizing') return
    const published = detail?.event?.status === 'published'
    if (published && !window.confirm(copy.confirmPublic)) return
    setPosterBusy(true)
    setPosterPhase('uploading')
    setPosterProgress(0)
    setPosterError('')
    setPosterNote('')
    try {
      let saved
      try {
        saved = await adminApi.uploadEventBanner(form.id, posterFile, published, setPosterProgress)
      } catch (error) {
        if (error.status === 409 && window.confirm(copy.confirmPublic)) saved = await adminApi.uploadEventBanner(form.id, posterFile, true, setPosterProgress)
        else throw error
      }
      if (saved?.banner) setForm((current) => current && { ...current, banner: saved.banner })
      setPosterFile(null)
      setPosterPreview((current) => {
        if (current) URL.revokeObjectURL(current)
        return ''
      })
      setPosterPhase('')
      setPosterProgress(1)
      setPosterNote(copy.posterSaved)
      loadDetail(form.id)
    } catch {
      setPosterPhase('ready')
      setPosterNote(copy.posterPending)
      setPosterError(copy.posterError)
    } finally {
      setPosterBusy(false)
    }
  }

  const removePoster = async () => {
    if (!form?.id || !form.banner) return
    const published = detail?.event?.status === 'published'
    if (!window.confirm(published ? copy.confirmPublic : copy.posterRemoveConfirm)) return
    setPosterBusy(true)
    setPosterError('')
    setPosterNote('')
    try {
      let saved
      try {
        saved = await adminApi.removeEventBanner(form.id, published)
      } catch (error) {
        if (error.status === 409 && window.confirm(copy.confirmPublic)) saved = await adminApi.removeEventBanner(form.id, true)
        else throw error
      }
      setForm((current) => current && { ...current, banner: saved?.banner || '' })
      setPosterNote(copy.posterRemoved)
      loadDetail(form.id)
    } catch {
      setPosterError(copy.posterError)
    } finally {
      setPosterBusy(false)
    }
  }
  const mine = (detail?.tasks || []).filter((task) => task.assigneeId === actor?.id)
  const shownTasks = dayMode ? mine.filter((task) => task.status !== 'done') : canManage && tab === 'operations' ? detail?.tasks || [] : mine.length ? mine : detail?.tasks || []

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      let data
      try {
        data = await adminApi.saveEvent(form.id, form)
      } catch (error) {
        if (error.status === 409 && error.body?.error === 'confirm' && window.confirm(copy.confirmPublic)) {
          data = await adminApi.saveEvent(form.id, { ...form, confirmPublic: true })
        } else throw error
      }
      setDetail(data)
      setForm(data.event)
      setMessage(data.warnings?.length ? `${copy.saved} ${copy.overlap}` : copy.saved)
      await loadList()
    } catch {
      setError(copy.loadError)
    } finally {
      setSaving(false)
    }
  }

  const act = async (action) => {
    if (action === 'archive' && !window.confirm(copy.archive)) return
    const data = await adminApi.eventAction(currentId, action)
    if (data.event) {
      setCurrentId(data.event.id)
      await loadList()
      loadDetail(data.event.id)
    } else {
      setDetail(data)
      setForm(data.event)
    }
  }

  const patchTask = async (task, patch) => {
    const saved = await adminApi.saveTask(currentId, { ...patch, id: task.id })
    setDetail((current) => ({ ...current, tasks: current.tasks.map((item) => (item.id === task.id ? saved.task : item)) }))
  }

  const moveActivity = (phaseIndex, index, direction) => {
    const phases = form.phases.map((phase) => ({ ...phase, activities: [...phase.activities] }))
    const listItems = phases[phaseIndex].activities
    const target = index + direction
    if (target < 0 || target >= listItems.length) return
    const [item] = listItems.splice(index, 1)
    listItems.splice(target, 0, item)
    setForm({ ...form, phases })
  }

  if (error && !detail) {
    return (
      <section className="adm-view">
        <h1>{copy.loadError}</h1>
        <button type="button" className="btn btn-primary" onClick={() => loadList()}>
          {copy.retry}
        </button>
      </section>
    )
  }

  return (
    <section className="adm-view event-desk">
      <header>
        <p className="kicker">{copy.kicker}</p>
        <h1 className="adm-title">{canManage ? copy.title : copy.staffTitle}</h1>
        <p className="adm-lead">{canManage ? copy.lead : copy.staffLead}</p>
      </header>

      <div className="event-toolbar">
        <select aria-label={copy.title} value={currentId} onChange={(event) => setCurrentId(event.target.value)}>
          {list.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} · {item.status}
            </option>
          ))}
        </select>
        <button type="button" className={`btn btn-sm ${dayMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDayMode((value) => !value)}>
          {dayMode ? copy.exitDay : copy.day}
        </button>
        {canManage ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('program')}>{copy.program}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('operations')}>{copy.operations}</button>
          </>
        ) : null}
      </div>

      {detail?.ops ? (
        <div className="event-stats">
          <article className="event-stat"><span>{copy.stats.activities}</span><strong>{detail.ops.activities}</strong></article>
          <article className="event-stat"><span>{copy.stats.done}</span><strong>{detail.ops.tasks.done || 0}</strong></article>
          <article className="event-stat"><span>{copy.stats.pending}</span><strong>{(detail.ops.tasks.todo || 0) + (detail.ops.tasks.progress || 0)}</strong></article>
          <article className="event-stat"><span>{copy.stats.blocked}</span><strong>{detail.ops.tasks.blocked || 0}</strong></article>
        </div>
      ) : null}

      {dayMode && detail ? (
        <section className="event-card event-day">
          <p className="kicker">{copy.now}</p>
          <h2>{detail.live?.current?.title || copy.none}</h2>
          {detail.live?.current?.team ? <p>{copy.teams[detail.live.current.team]}</p> : null}
          <p className="kicker">{copy.next}</p>
          <h2>{detail.live?.next?.title || '—'}</h2>
          {detail.live?.next?.at ? <p>{copy.until} {Math.max(0, Math.ceil((Date.parse(detail.live.next.at) - Date.now()) / 60000))} min</p> : null}
        </section>
      ) : null}

      {detail && (tab === 'operations' || !canManage) ? (
        <section className="event-card">
          <h2>{copy.program}</h2>
          <ol>
            {detail.event.phases.map((phase) => (
              <li key={phase.key}>
                <strong>{phase.title}</strong> · {copy.days[phase.day]} · {[phase.start, phase.end].filter(Boolean).join(' – ')} · {phase.visibility === 'internal' ? copy.internal : copy.public}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {canManage && tab === 'program' && form ? (
        <section className="event-card event-poster-admin">
          <h2>{copy.posterTitle}</h2>
          <p className="event-poster-lead">{copy.posterLead}</p>
          <div className="event-poster-frame">
            {posterPreview || form.banner ? <img src={posterPreview || form.banner} alt="" /> : <p>{copy.posterEmpty}</p>}
          </div>
          {posterPhase === 'optimizing' ? <p className="event-poster-lead">{copy.posterOptimizing}</p> : null}
          {posterPhase === 'uploading' ? <p className="event-poster-lead">{copy.posterUploading}</p> : null}
          {posterPhase === 'optimizing' || posterPhase === 'uploading' ? (
            <div className={`event-poster-progress${posterPhase === 'optimizing' ? ' is-busy' : ''}`} aria-hidden="true">
              <span style={posterPhase === 'uploading' ? { width: `${Math.round(posterProgress * 100)}%` } : undefined} />
            </div>
          ) : null}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" disabled={posterBusy || posterPhase === 'optimizing'} onChange={choosePoster} />
          <div className="event-toolbar">
            <button type="button" className="btn btn-primary" disabled={!posterFile || posterBusy || posterPhase === 'optimizing'} onClick={savePoster}>
              {posterPhase === 'optimizing' ? copy.posterOptimizing : posterBusy ? copy.saving : copy.posterSave}
            </button>
            {posterPreview ? (
              <button type="button" className="btn btn-ghost" disabled={posterBusy} onClick={clearPosterDraft}>
                {copy.posterCancel}
              </button>
            ) : null}
            {form.banner ? (
              <button type="button" className="btn btn-ghost" disabled={posterBusy} onClick={removePoster}>
                {copy.posterRemove}
              </button>
            ) : null}
          </div>
          {posterNote ? <p className="event-poster-lead">{posterNote}</p> : null}
          {posterError ? <p className="event-poster-error">{posterError}</p> : null}
        </section>
      ) : null}

      {canManage && tab === 'program' && form ? (
        <form
          className="event-card event-fields"
          onSubmit={(event) => {
            event.preventDefault()
            save(false)
          }}
        >
          <label className="event-span">{copy.fields.title}<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>{copy.fields.organizer}<input value={form.organizer} onChange={(event) => setForm({ ...form, organizer: event.target.value })} /></label>
          <label>{copy.fields.date}<input type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></label>
          <label>{copy.fields.location}<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
          <label className="event-span">{copy.fields.summary}<textarea rows="3" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
          <label className="event-span">{copy.fields.parents}<textarea rows="3" value={form.parentInfo} onChange={(event) => setForm({ ...form, parentInfo: event.target.value })} /></label>
          <div className="event-span">
            {form.phases.map((phase, phaseIndex) => (
              <article key={`${phase.key}-${phaseIndex}`} className="event-phase-card">
                <div className="event-phase-head">
                  <strong>{phase.title || copy.fields.phase}</strong>
                  <span className="event-toolbar">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                      if (phaseIndex === 0) return
                      const phases = [...form.phases]
                      const [item] = phases.splice(phaseIndex, 1)
                      phases.splice(phaseIndex - 1, 0, item)
                      setForm({ ...form, phases })
                    }}>{copy.up}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                      if (phaseIndex >= form.phases.length - 1) return
                      const phases = [...form.phases]
                      const [item] = phases.splice(phaseIndex, 1)
                      phases.splice(phaseIndex + 1, 0, item)
                      setForm({ ...form, phases })
                    }}>{copy.down}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                      if (!window.confirm(copy.remove)) return
                      setForm({ ...form, phases: form.phases.filter((_, index) => index !== phaseIndex) })
                    }}>{copy.remove}</button>
                  </span>
                </div>
                <div className="event-fields">
                  <label>{copy.fields.phase}<input value={phase.title} onChange={(event) => {
                    const phases = [...form.phases]
                    phases[phaseIndex] = { ...phase, title: event.target.value }
                    setForm({ ...form, phases })
                  }} /></label>
                  <label>{copy.fields.visibility}
                    <select value={phase.visibility} onChange={(event) => {
                      const phases = [...form.phases]
                      phases[phaseIndex] = { ...phase, visibility: event.target.value }
                      setForm({ ...form, phases })
                    }}>
                      <option value="public">{copy.public}</option>
                      <option value="internal">{copy.internal}</option>
                    </select>
                  </label>
                  <label>{copy.days.event}
                    <select value={phase.day} onChange={(event) => {
                      const phases = [...form.phases]
                      phases[phaseIndex] = { ...phase, day: event.target.value }
                      setForm({ ...form, phases })
                    }}>
                      {Object.entries(copy.days).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                  <label>{copy.fields.start}<input value={phase.start} placeholder="14:00" onChange={(event) => {
                    const phases = [...form.phases]
                    phases[phaseIndex] = { ...phase, start: event.target.value }
                    setForm({ ...form, phases })
                  }} /></label>
                  <label>{copy.fields.end}<input value={phase.end} placeholder="15:00" onChange={(event) => {
                    const phases = [...form.phases]
                    phases[phaseIndex] = { ...phase, end: event.target.value }
                    setForm({ ...form, phases })
                  }} /></label>
                </div>
                {phase.activities.map((item, index) => (
                  <div
                    key={`${item.key}-${index}`}
                    className="event-activity-edit"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', `${phaseIndex}:${index}`)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const [fromPhase, fromIndex] = event.dataTransfer.getData('text/plain').split(':').map(Number)
                      if (fromPhase !== phaseIndex || Number.isNaN(fromIndex)) return
                      const delta = index - fromIndex
                      if (delta) moveActivity(phaseIndex, fromIndex, delta)
                    }}
                  >
                    <label>{copy.fields.activity}<input value={item.title} onChange={(event) => {
                      const phases = [...form.phases]
                      const activities = [...phase.activities]
                      activities[index] = { ...item, title: event.target.value }
                      phases[phaseIndex] = { ...phase, activities }
                      setForm({ ...form, phases })
                    }} /></label>
                    <div className="event-fields">
                      <label>{copy.fields.start}<input value={item.start} onChange={(event) => {
                        const phases = [...form.phases]
                        const activities = [...phase.activities]
                        activities[index] = { ...item, start: event.target.value }
                        phases[phaseIndex] = { ...phase, activities }
                        setForm({ ...form, phases })
                      }} /></label>
                      <label>{copy.fields.end}<input value={item.end} onChange={(event) => {
                        const phases = [...form.phases]
                        const activities = [...phase.activities]
                        activities[index] = { ...item, end: event.target.value }
                        phases[phaseIndex] = { ...phase, activities }
                        setForm({ ...form, phases })
                      }} /></label>
                      <label>{copy.fields.team}
                        <select value={item.team} onChange={(event) => {
                          const phases = [...form.phases]
                          const activities = [...phase.activities]
                          activities[index] = { ...item, team: event.target.value }
                          phases[phaseIndex] = { ...phase, activities }
                          setForm({ ...form, phases })
                        }}>
                          <option value="">—</option>
                          {TEAMS.map((team) => <option key={team} value={team}>{copy.teams[team]}</option>)}
                        </select>
                      </label>
                      <label>{copy.fields.visibility}
                        <select value={item.visibility} onChange={(event) => {
                          const phases = [...form.phases]
                          const activities = [...phase.activities]
                          activities[index] = { ...item, visibility: event.target.value }
                          phases[phaseIndex] = { ...phase, activities }
                          setForm({ ...form, phases })
                        }}>
                          <option value="public">{copy.public}</option>
                          <option value="internal">{copy.internal}</option>
                        </select>
                      </label>
                    </div>
                    <label>{copy.fields.detail}<textarea rows="2" value={item.detail} onChange={(event) => {
                      const phases = [...form.phases]
                      const activities = [...phase.activities]
                      activities[index] = { ...item, detail: event.target.value }
                      phases[phaseIndex] = { ...phase, activities }
                      setForm({ ...form, phases })
                    }} /></label>
                    <div className="event-toolbar">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveActivity(phaseIndex, index, -1)}>{copy.up}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveActivity(phaseIndex, index, 1)}>{copy.down}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                        if (!window.confirm(copy.remove)) return
                        const phases = [...form.phases]
                        phases[phaseIndex] = { ...phase, activities: phase.activities.filter((_, itemIndex) => itemIndex !== index) }
                        setForm({ ...form, phases })
                      }}>{copy.remove}</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                  const phases = [...form.phases]
                  phases[phaseIndex] = { ...phase, activities: [...phase.activities, blankActivity()] }
                  setForm({ ...form, phases })
                }}>{copy.addActivity}</button>
              </article>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, phases: [...form.phases, blankPhase()] })}>{copy.addPhase}</button>
          </div>
          {dirty ? <p className="event-span">{copy.unsaved}</p> : null}
          {message ? <p className="event-span" role="status">{message}</p> : null}
          <div className="event-toolbar event-span">
            <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>{saving ? copy.saving : copy.save}</button>
            <button type="button" className="btn btn-ghost" onClick={() => act('publish')}>{copy.publish}</button>
            <button type="button" className="btn btn-ghost" onClick={() => act('unpublish')}>{copy.unpublish}</button>
            <button type="button" className="btn btn-ghost" onClick={() => act('archive')}>{copy.archive}</button>
            <button type="button" className="btn btn-ghost" onClick={() => act('duplicate')}>{copy.duplicate}</button>
            {form.slug ? (
              <a className="btn btn-ghost" href={`/events/${form.slug}${form.status === 'published' ? '' : '?preview=1'}`} target="_blank" rel="noopener noreferrer">
                {form.status === 'published' ? copy.open : copy.preview}
              </a>
            ) : null}
          </div>
        </form>
      ) : null}

      {(tab === 'operations' || !canManage || dayMode) && detail ? (
        <div className="event-card">
          <div className="event-toolbar">
            <h2>{dayMode || !canManage ? copy.mine : copy.allTasks}</h2>
          </div>
          {shownTasks.map((task) => {
            const own = canManage || task.assigneeId === actor?.id
            return (
              <article key={task.id} className="event-task-row">
                <div>
                  <strong>{task.title}</strong>
                  <p>{copy.days[task.day]} · {[task.start, task.end].filter(Boolean).join(' – ')} · {task.team ? copy.teams[task.team] : '—'} · {task.assigneeName || '—'}</p>
                  {task.detail ? <p>{task.detail}</p> : null}
                </div>
                <div className="event-toolbar">
                  <span className={`event-pill is-${task.status === 'blocked' ? 'blocked' : task.status}`}>{copy.status[task.status]}</span>
                  <span className={`event-pill${task.priority === 'urgent' ? ' is-urgent' : ''}`}>{copy.priority[task.priority]}</span>
                  {own ? (
                    <select aria-label={copy.status.todo} value={task.status} onChange={(event) => patchTask(task, { status: event.target.value })}>
                      {Object.entries(copy.status).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  ) : null}
                </div>
                {task.checklist?.length ? (
                  <ul>
                    {task.checklist.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={item.done}
                            disabled={!own}
                            onChange={() => patchTask(task, { checklist: task.checklist.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)) })}
                          />
                          {item.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {task.notes ? <p>{task.notes}</p> : null}
                {task.completedAt ? <p>{new Date(task.completedAt).toLocaleString()}</p> : null}
                {own ? (
                  <form
                    className="event-toolbar"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const update = event.currentTarget.elements.update.value.trim()
                      const notes = event.currentTarget.elements.notes.value
                      if (!update && notes === (task.notes || '')) return
                      patchTask(task, { ...(update ? { update } : {}), notes })
                      event.currentTarget.elements.update.value = ''
                    }}
                  >
                    <input name="notes" aria-label={copy.fields.notes} defaultValue={task.notes || ''} />
                    <input name="update" aria-label={copy.fields.detail} placeholder={copy.fields.detail} />
                    <button type="submit" className="btn btn-ghost btn-sm">{copy.save}</button>
                  </form>
                ) : null}
              </article>
            )
          })}
          {canManage ? (
            <form className="event-fields" onSubmit={async (event) => {
              event.preventDefault()
              const person = roster.find((item) => item.id === taskDraft.assigneeId)
              const checklist = taskDraft.checklist.split('\n').map((label) => label.trim()).filter(Boolean).map((label, index) => ({ id: `check-${index + 1}`, label, done: false }))
              await adminApi.saveTask(currentId, { ...taskDraft, checklist, assigneeName: person?.name || '' })
              setTaskDraft({ title: '', detail: '', team: '', day: 'event', start: '', priority: 'normal', assigneeId: '', checklist: '' })
              loadDetail(currentId)
            }}>
              <label>{copy.fields.title}<input value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} required /></label>
              <label>{copy.fields.team}
                <select value={taskDraft.team} onChange={(event) => setTaskDraft({ ...taskDraft, team: event.target.value })}>
                  <option value="">—</option>
                  {TEAMS.map((team) => <option key={team} value={team}>{copy.teams[team]}</option>)}
                </select>
              </label>
              <label>{copy.fields.assignee}
                <select value={taskDraft.assigneeId} onChange={(event) => setTaskDraft({ ...taskDraft, assigneeId: event.target.value })}>
                  <option value="">—</option>
                  {roster.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </label>
              <label>{copy.fields.start}<input value={taskDraft.start} placeholder="08:00" onChange={(event) => setTaskDraft({ ...taskDraft, start: event.target.value })} /></label>
              <label className="event-span">{copy.checks}<textarea rows="2" value={taskDraft.checklist} onChange={(event) => setTaskDraft({ ...taskDraft, checklist: event.target.value })} /></label>
              <button type="submit" className="btn btn-primary btn-sm">{copy.addTask}</button>
            </form>
          ) : null}
        </div>
      ) : null}

      {detail ? (
        <section className="event-card">
          <h2>{copy.notices}</h2>
          {(detail.notices || []).map((notice) => (
            <article key={notice.id} className="event-task-row">
              <div>
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
              </div>
              {notice.requiresAck ? (
                <button type="button" className="btn btn-ghost btn-sm" disabled={notice.acknowledged} onClick={async () => {
                  const saved = await adminApi.ackNotice(currentId, notice.id)
                  setDetail((current) => ({ ...current, notices: current.notices.map((item) => (item.id === notice.id ? saved.notice : item)) }))
                }}>{notice.acknowledged ? copy.acked : copy.ack}</button>
              ) : null}
            </article>
          ))}
          {canManage ? (
            <form className="event-stack" onSubmit={async (event) => {
              event.preventDefault()
              await adminApi.saveNotice(currentId, noticeDraft)
              setNoticeDraft({ title: '', body: '', urgent: false, requiresAck: true })
              loadDetail(currentId)
            }}>
              <label>{copy.fields.noticeTitle}<input value={noticeDraft.title} onChange={(event) => setNoticeDraft({ ...noticeDraft, title: event.target.value })} required /></label>
              <label>{copy.fields.noticeBody}<textarea rows="3" value={noticeDraft.body} onChange={(event) => setNoticeDraft({ ...noticeDraft, body: event.target.value })} required /></label>
              <label><input type="checkbox" checked={noticeDraft.urgent} onChange={(event) => setNoticeDraft({ ...noticeDraft, urgent: event.target.checked })} /> {copy.priority.urgent}</label>
              <label><input type="checkbox" checked={noticeDraft.requiresAck} onChange={(event) => setNoticeDraft({ ...noticeDraft, requiresAck: event.target.checked })} /> {copy.ack}</label>
              <button type="submit" className="btn btn-primary btn-sm">{copy.addNotice}</button>
            </form>
          ) : null}
          {form?.slug ? <p><a href={publicUrl(`/events/${form.slug}`)}>{publicUrl(`/events/${form.slug}`)}</a></p> : null}
        </section>
      ) : null}
      {!list.length && !error ? <p>{copy.empty}</p> : null}
    </section>
  )
}
