import mongoose from 'mongoose'

export const STORY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const STORY_IMAGE_LIMIT = 4_500_000

/** Uploaded mission and activity photographs. Kept in MongoDB so they survive Render restarts and deploys. */
const storyImageSchema = new mongoose.Schema(
  {
    contentType: { type: String, enum: STORY_IMAGE_TYPES, required: true },
    data: { type: Buffer, required: true },
    bytes: { type: Number, required: true, min: 1, max: STORY_IMAGE_LIMIT },
    attached: { type: Boolean, default: false, index: true },
    uploadedBy: { type: String, default: '', maxlength: 80 },
  },
  { timestamps: true },
)

export const StoryImage = mongoose.models.StoryImage || mongoose.model('StoryImage', storyImageSchema)
