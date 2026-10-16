import mongoose from 'mongoose'

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting']

export const dbState = () => STATES[mongoose.connection.readyState] ?? 'unknown'

/** Connects to MongoDB using `MONGODB_URI`. Resolves to `true` on success, `false` otherwise. */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    console.error('[db] MONGODB_URI is not defined — copy server/.env.example to server/.env')
    return false
  }

  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'))
  mongoose.connection.on('reconnected', () => console.log('[db] MongoDB reconnected'))

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    const { host, port, name } = mongoose.connection
    console.log(`[db] Connected to mongodb://${host}:${port}/${name}`)
    return true
  } catch (error) {
    console.error(`[db] Connection failed: ${error.message}`)
    return false
  }
}

export const disconnectDB = () => mongoose.disconnect()
