import { useEffect, useMemo, useState } from 'react'
import { STORIES } from '../../../shared/catalog.js'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'

const MEDIA = [...new Set(STORIES.flatMap((story) => [story.cover, ...story.images.map((image) => image.src)]))]

const COPY = {
  fr: {
    title: 'Archives publiques',
    lead: 'Missions et activités affichées sur le site. Une histoire dépubliée disparaît du site, pas des candidatures.',
    new: 'Nouvelle histoire',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    remove: 'Supprimer',
    published: 'Publiée',
    featured: 'À la une',
    kind: 'Type',
    mission: 'Mission',
    activity: 'Activité',
    empty: 'Aucune histoire pour le moment.',
    saved: 'Enregistré.',
    failed: 'Enregistrement impossible.',
  },
  en: {
    title: 'Public archive',
    lead: 'Missions and activities shown on the site. Unpublishing hides a story. It does not touch applications.',
    new: 'New story',
    save: 'Save',
    saving: 'Saving…',
    remove: 'Delete',
    published: 'Published',
    featured: 'Featured',
    kind: 'Type',
    mission: 'Mission',
    activity: 'Activity',
    empty: 'No stories yet.',
    saved: 'Saved.',
    failed: 'Could not save.',
  },
  ar: {
    title: 'الأرشيف العام',
    lead: 'المهام والأنشطة الظاهرة في الموقع. إلغاء النشر يخفي القصة ولا يمس طلبات الانضمام.',
    new: 'قصة جديدة',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    remove: 'حذف',
    published: 'منشورة',
    featured: 'مختارة',
    kind: 'النوع',
    mission: 'مهمة',
    activity: 'نشاط',
    empty: 'لا قصص بعد.',
    saved: 'تم الحفظ.',
    failed: 'تعذر الحفظ.',
  },
}

const blank = () => ({
  kind: 'mission',
  slug: '',
  title: '',
  summary: '',
  body: '',
  category: '',
  location: '',
  year: '',
  featured: false,
  published: false,
  sort: 200,
  cover: MEDIA[0] || '',
  images: [],
})

export const ContentDesk = () => {
  const { locale } = useI18n()
  const copy = COPY[locale] || COPY.fr
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState(null)
  const [draft, setDraft] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    adminApi.stories().then((data) => {
      setItems(data.items)
      setCategories(data.categories)
    })

  useEffect(() => {
    let live = true
    adminApi.stories().then((data) => {
      if (!live) return
      setItems(data.items)
      setCategories(data.categories)
    })
    return () => {
      live = false
    }
  }, [])

  const options = useMemo(() => categories?.[draft?.kind] || [], [categories, draft?.kind])

  const edit = (item) =>
    setDraft({
      ...item,
      body: (item.body || []).join('\n\n'),
      images: item.images || [],
    })

  const save = async () => {
    setStatus('saving')
    setError('')
    try {
      const body = {
        ...draft,
        body: draft.body.split(/\n{2,}/),
        images: (draft.images || []).map((image) => (typeof image === 'string' ? { src: image, alt: draft.title, caption: '' } : image)),
      }
      await adminApi.saveStory(body)
      await load()
      setStatus('saved')
    } catch (err) {
      setStatus('')
      setError(err.body?.error || copy.failed)
    }
  }

  const remove = async () => {
    if (!draft?.id) return setDraft(null)
    await adminApi.deleteStory(draft.id)
    setDraft(null)
    await load()
  }

  const toggleImage = (src) => {
    const has = draft.images.some((image) => image.src === src)
    const images = has ? draft.images.filter((image) => image.src !== src) : [...draft.images, { src, alt: draft.title, caption: '' }]
    setDraft({ ...draft, images, cover: draft.cover || src })
  }

  return (
    <section className="adm-panel adm-desk">
      <header className="adm-page-head">
        <div>
          <p className="adm-kicker">{copy.kind}</p>
          <h1>{copy.title}</h1>
          <p className="adm-lead">{copy.lead}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDraft(blank())}>
          {copy.new}
        </button>
      </header>
      <div className="adm-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 20 }}>
        <ul style={{ display: 'grid', gap: 8 }}>
          {!items.length ? <li>{copy.empty}</li> : null}
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="btn btn-ghost" onClick={() => edit(item)} aria-current={draft?.id === item.id ? 'true' : undefined} style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>{item.title}</span>
                <small>{item.published ? '●' : '○'}</small>
              </button>
            </li>
          ))}
        </ul>
        {draft ? (
          <form
            className="adm-block"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
            style={{ display: 'grid', gap: 10 }}
          >
            <label>
              {copy.kind}
              <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value, category: '' })}>
                <option value="mission">{copy.mission}</option>
                <option value="activity">{copy.activity}</option>
              </select>
            </label>
            <label>
              Slug
              <input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} required />
            </label>
            <label>
              Titre
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
            </label>
            <label>
              Résumé
              <textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
            </label>
            <label>
              Texte
              <textarea rows={8} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
            </label>
            <label>
              Catégorie
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                <option value="">—</option>
                {options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fr}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lieu
              <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
            </label>
            <label>
              Année
              <input value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} inputMode="numeric" />
            </label>
            <label>
              Ordre
              <input type="number" value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: Number(event.target.value) })} />
            </label>
            <label>
              <input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /> {copy.published}
            </label>
            <label>
              <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /> {copy.featured}
            </label>
            <fieldset>
              <legend>Images</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
                {MEDIA.map((src) => {
                  const on = draft.images.some((image) => image.src === src) || draft.cover === src
                  return (
                    <button key={src} type="button" onClick={() => toggleImage(src)} aria-pressed={on} style={{ padding: 0, border: on ? '2px solid var(--green-bright)' : '2px solid transparent' }}>
                      <img src={src} alt="" style={{ width: '100%', height: 72, objectFit: 'cover' }} />
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="adm-actions">
              <button className="btn btn-primary" type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? copy.saving : copy.save}
              </button>
              <button className="btn btn-ghost" type="button" onClick={remove}>
                {copy.remove}
              </button>
            </div>
            {status === 'saved' ? <p role="status">{copy.saved}</p> : null}
            {error ? <p role="alert">{error}</p> : null}
          </form>
        ) : null}
      </div>
    </section>
  )
}
