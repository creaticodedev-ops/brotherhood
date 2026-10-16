import { CATEGORIES, STORIES } from '../../shared/catalog.js'
import { Story } from '../models/Story.js'

export const seedStories = async () => {
  const count = await Story.estimatedDocumentCount()
  if (count) return
  await Story.insertMany(STORIES)
  console.log(`[stories] Seeded ${STORIES.length} story(ies) from the Brotherhood archive`)
}

export { CATEGORIES }
