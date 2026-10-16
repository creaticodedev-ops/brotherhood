import mongoose from 'mongoose'

const imageSchema = new mongoose.Schema(
  {
    src: { type: String, required: true, maxlength: 240 },
    alt: { type: String, default: '', maxlength: 240 },
    caption: { type: String, default: '', maxlength: 400 },
  },
  { _id: false },
)

const storySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['mission', 'activity'], required: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    summary: { type: String, default: '', maxlength: 500 },
    body: { type: [String], default: [] },
    category: { type: String, default: '', maxlength: 40 },
    location: { type: String, default: '', maxlength: 120 },
    year: { type: String, default: '', maxlength: 8 },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false, index: true },
    sort: { type: Number, default: 0 },
    cover: { type: String, default: '', maxlength: 240 },
    images: { type: [imageSchema], default: [] },
  },
  { timestamps: true },
)

export const Story = mongoose.models.Story || mongoose.model('Story', storySchema)

export const toStory = (doc) => ({
  id: String(doc._id),
  kind: doc.kind,
  slug: doc.slug,
  title: doc.title,
  summary: doc.summary || '',
  body: doc.body || [],
  category: doc.category || '',
  location: doc.location || '',
  year: doc.year || '',
  featured: Boolean(doc.featured),
  published: Boolean(doc.published),
  sort: doc.sort || 0,
  cover: doc.cover || doc.images?.[0]?.src || '',
  images: (doc.images || []).map(({ src, alt, caption }) => ({ src, alt: alt || '', caption: caption || '' })),
  updatedAt: doc.updatedAt,
})
