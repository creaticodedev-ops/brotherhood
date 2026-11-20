import { parseZonedInput } from './registrationWindow.js'

export const EVENT_ZONE = 'Africa/Casablanca'
export const EVENT_SLUG = 'childrens-day'
export const TEAMS = ['reception', 'entertainment', 'workshops', 'logistics', 'gifts', 'photography', 'dismantling']
export const TASK_STATUSES = ['todo', 'progress', 'blocked', 'done']
export const PRIORITIES = ['normal', 'high', 'urgent']
export const EVENT_STATUSES = ['draft', 'published', 'archived']
export const PHASE_DAYS = ['friday', 'saturday', 'event', 'after']
export const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

const clean = (value, max) => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)

export const activity = (key, title, detail, start, end, team, visibility = 'public') => ({
  key,
  title,
  detail,
  start,
  end,
  team,
  visibility,
})

/** The Children's Day program as given. Date and place stay empty until an administrator sets them. */
export const CHILDREN_DAY = {
  slug: EVENT_SLUG,
  title: "Journée de l'enfance",
  organizer: 'The Brotherhood',
  summary: "Programme de la journée de l'enfance organisée par The Brotherhood.",
  location: '',
  eventDate: '',
  timeZone: EVENT_ZONE,
  parentInfo: '',
  phases: [
    {
      key: 'accueil',
      day: 'event',
      title: 'Accueil & Ouverture',
      start: '14:00',
      end: '15:00',
      visibility: 'public',
      activities: [
        activity('welcome', 'Accueil des enfants', 'Accueil des enfants.', '14:00', '15:00', 'reception'),
        activity('opening-show', 'DJ, mascottes, clowns, musique et danses', 'Animation d’ouverture.', '14:00', '15:00', 'entertainment'),
        activity('presentation', 'Présentation du programme et stand caravane', 'Présentation du programme et stand de la caravane.', '14:00', '15:00', 'reception'),
        activity('face-paint', 'Maquillage', 'Maquillage.', '14:00', '15:00', 'entertainment'),
      ],
    },
    {
      key: 'shows',
      day: 'event',
      title: 'Shows & Animations',
      start: '15:30',
      end: '',
      visibility: 'public',
      activities: [activity('magician', 'Spectacle de magie', 'Spectacle du magicien.', '15:30', '', 'entertainment')],
    },
    {
      key: 'workshops',
      day: 'event',
      title: 'Ateliers & Découverte',
      start: '16:00',
      end: '17:30',
      visibility: 'public',
      activities: [
        activity('workshops', 'Ateliers et aires de jeux', 'Ateliers et espaces de jeu.', '16:00', '17:30', 'workshops'),
        activity('inflatables', 'Jeux gonflables', 'Jeux gonflables.', '16:00', '17:30', 'workshops'),
        activity('passport', 'Passeports d’ateliers et groupes', 'Cartes passeport et groupes d’enfants organisés.', '16:00', '17:30', 'workshops'),
        activity('parent-messages', 'Messages des parents', 'Activité de messages des parents.', '16:00', '17:30', 'reception'),
      ],
    },
    {
      key: 'close',
      day: 'event',
      title: 'Clôture',
      start: '17:30',
      end: '18:00',
      visibility: 'public',
      activities: [
        activity('gifts', 'Cadeaux et friandises', 'Cadeaux et friandises.', '17:30', '', 'gifts'),
        activity('group-photo', 'Photo de groupe', 'Photo de groupe et message « Vive l’enfance ! ».', '17:50', '', 'photography'),
        activity('official-close', 'Clôture officielle', 'Clôture officielle.', '18:00', '', 'logistics'),
      ],
    },
    {
      key: 'prep',
      day: 'friday',
      title: 'Préparation',
      start: '20:00',
      end: '',
      visibility: 'internal',
      activities: [activity('friday-prep', 'Préparation de l’événement', 'Préparation à partir de 20:00.', '20:00', '', 'logistics', 'internal')],
    },
    {
      key: 'setup',
      day: 'saturday',
      title: 'Installation',
      start: '08:00',
      end: '12:00',
      visibility: 'internal',
      activities: [activity('saturday-setup', 'Installation générale', 'Installation et mise en place, de 08:00 à 12:00.', '08:00', '12:00', 'logistics', 'internal')],
    },
    {
      key: 'strike',
      day: 'after',
      title: 'Après l’événement',
      start: '18:20',
      end: '',
      visibility: 'internal',
      activities: [activity('dismantle', 'Démontage', 'Démontage par l’équipe.', '18:20', '', 'dismantling', 'internal')],
    },
  ],
}

export const SEED_TASKS = [
  { key: 'friday-prep', title: 'Préparation', detail: 'Préparation de l’événement à partir de 20:00.', day: 'friday', start: '20:00', end: '', team: 'logistics', priority: 'high' },
  { key: 'saturday-setup', title: 'Installation générale', detail: 'Installation et mise en place.', day: 'saturday', start: '08:00', end: '12:00', team: 'logistics', priority: 'high' },
  { key: 'dismantle', title: 'Démontage', detail: 'Démontage par l’équipe après la clôture.', day: 'after', start: '18:20', end: '', team: 'dismantling', priority: 'high' },
]

const clockOk = (value) => value === '' || CLOCK.test(value)
const dayOk = (value) => PHASE_DAYS.includes(value)

export const clockToMinutes = (value) => {
  if (!CLOCK.test(value || '')) return null
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const left = clockToMinutes(aStart)
  const right = clockToMinutes(bStart)
  if (left == null || right == null) return false
  const aStop = clockToMinutes(aEnd) ?? left + 1
  const bStop = clockToMinutes(bEnd) ?? right + 1
  return left < bStop && right < aStop
}

export const validateProgram = (phases) => {
  const errors = []
  const warnings = []
  const seen = new Map()
  phases.forEach((phase, phaseIndex) => {
    if (!clockOk(phase.start) || !clockOk(phase.end)) errors.push({ path: `phases.${phaseIndex}.time`, code: 'clock' })
    if (phase.start && phase.end && clockToMinutes(phase.end) <= clockToMinutes(phase.start)) errors.push({ path: `phases.${phaseIndex}.time`, code: 'order' })
    phase.activities.forEach((item, index) => {
      if (!item.title) errors.push({ path: `phases.${phaseIndex}.activities.${index}.title`, code: 'required' })
      if (!clockOk(item.start) || !clockOk(item.end)) errors.push({ path: `phases.${phaseIndex}.activities.${index}.time`, code: 'clock' })
      if (item.start && item.end && clockToMinutes(item.end) <= clockToMinutes(item.start)) errors.push({ path: `phases.${phaseIndex}.activities.${index}.time`, code: 'order' })
      if (item.visibility === 'public' && phase.visibility === 'public' && item.start) {
        const bucket = seen.get(phase.day) || []
        bucket.forEach((other) => {
          if (rangesOverlap(item.start, item.end, other.start, other.end)) warnings.push({ code: 'overlap', title: item.title, other: other.title })
        })
        bucket.push(item)
        seen.set(phase.day, bucket)
      }
    })
  })
  return { errors, warnings }
}

export const readProgram = (body = {}) => {
  const phases = Array.isArray(body.phases) ? body.phases.slice(0, 24) : []
  const next = phases.map((phase, phaseIndex) => ({
    key: clean(phase?.key, 40) || `phase-${phaseIndex + 1}`,
    day: dayOk(phase?.day) ? phase.day : 'event',
    title: clean(phase?.title, 120),
    start: clockOk(phase?.start) ? phase.start || '' : '',
    end: clockOk(phase?.end) ? phase.end || '' : '',
    visibility: phase?.visibility === 'internal' ? 'internal' : 'public',
    activities: (Array.isArray(phase?.activities) ? phase.activities : []).slice(0, 40).map((item, index) => ({
      key: clean(item?.key, 40) || `activity-${phaseIndex + 1}-${index + 1}`,
      title: clean(item?.title, 160),
      detail: clean(item?.detail, 600),
      start: clockOk(item?.start) ? item.start || '' : '',
      end: clockOk(item?.end) ? item.end || '' : '',
      team: TEAMS.includes(item?.team) ? item.team : '',
      visibility: item?.visibility === 'internal' || phase?.visibility === 'internal' ? 'internal' : 'public',
    })),
  }))
  const eventDate = DATE_KEY.test(body.eventDate || '') ? body.eventDate : ''
  const data = {
    title: clean(body.title, 140),
    organizer: clean(body.organizer, 120),
    summary: clean(body.summary, 600),
    location: clean(body.location, 160),
    eventDate,
    timeZone: body.timeZone === EVENT_ZONE ? EVENT_ZONE : EVENT_ZONE,
    parentInfo: clean(body.parentInfo, 800),
    banner: /^\/api\/media\/[a-f0-9]{24}$/.test(body.banner || '') ? body.banner : '',
    phases: next.filter((phase) => phase.title),
  }
  const check = validateProgram(data.phases)
  if (!data.title) check.errors.push({ path: 'title', code: 'required' })
  return { data, ...check }
}

const instant = (date, clock, timeZone) => {
  if (!date || !CLOCK.test(clock || '')) return null
  const parsed = parseZonedInput(`${date}T${clock}`, timeZone)
  return parsed.ok && parsed.date ? parsed.date.toISOString() : null
}

const publicActivity = (item) => ({
  key: item.key,
  title: item.title,
  detail: item.detail,
  start: item.start,
  end: item.end,
})

export const publicProgram = (event) => {
  if (!event || event.status !== 'published') return null
  const phases = (event.phases || [])
    .filter((phase) => phase.visibility !== 'internal')
    .map((phase) => ({
      key: phase.key,
      title: phase.title,
      start: phase.start,
      end: phase.end,
      activities: (phase.activities || []).filter((item) => item.visibility !== 'internal').map(publicActivity),
    }))
    .filter((phase) => phase.activities.length || phase.title)
  return {
    slug: event.slug,
    title: event.title,
    organizer: event.organizer,
    summary: event.summary,
    location: event.location,
    eventDate: event.eventDate,
    timeZone: event.timeZone || EVENT_ZONE,
    parentInfo: event.parentInfo,
    banner: event.banner || '',
    publicUpdatedAt: event.publicUpdatedAt || null,
    phases,
  }
}

export const timeline = (event, { includeInternal = false } = {}) => {
  const rows = []
  ;(event?.phases || []).forEach((phase) => {
    if (!includeInternal && phase.visibility === 'internal') return
    if ((phase.day || 'event') !== 'event') return
    ;(phase.activities || []).forEach((item) => {
      if (!includeInternal && item.visibility === 'internal') return
      const at = instant(event.eventDate, item.start || phase.start, event.timeZone || EVENT_ZONE)
      const until = instant(event.eventDate, item.end || phase.end, event.timeZone || EVENT_ZONE)
      rows.push({ key: item.key, title: item.title, phase: phase.title, team: item.team || '', at, until, start: item.start || phase.start, end: item.end || phase.end })
    })
  })
  return rows.filter((row) => row.at).sort((a, b) => a.at.localeCompare(b.at))
}

/** Current and next public activity. Without a configured date, nothing is claimed to be happening. */
export const liveState = (event, now = new Date(), options) => {
  const rows = timeline(event, options)
  if (!event?.eventDate || !rows.length) return { current: null, next: rows[0] || null, rows }
  const time = new Date(now).getTime()
  let current = null
  let next = null
  rows.forEach((row) => {
    const start = Date.parse(row.at)
    const end = row.until ? Date.parse(row.until) : start + 20 * 60 * 1000
    if (!current && time >= start && time < end) current = row
    else if (time < start && !next) next = row
  })
  if (current) next = rows.find((row) => Date.parse(row.at) > Date.parse(current.at)) || null
  return { current, next, rows }
}

export const publicChanged = (before, after) => JSON.stringify(publicProgram({ ...before, status: 'published' })) !== JSON.stringify(publicProgram({ ...after, status: 'published' }))

export const canUpdateTask = (actor, task) => {
  const permissions = actor?.permissions || []
  const manage = permissions.includes('*') || permissions.includes('events.manage')
  if (manage) return true
  if (!permissions.includes('events.operate')) return false
  return Boolean(task?.assigneeId) && task.assigneeId === actor.id
}
