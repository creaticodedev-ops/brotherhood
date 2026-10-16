import { EventEmitter } from 'node:events'

/** In-process bus feeding the admin Server-Sent Events stream. */
const bus = new EventEmitter()
bus.setMaxListeners(0)

export const publish = (event, data) => bus.emit('event', event, data)

export const subscribe = (listener) => {
  bus.on('event', listener)
  return () => bus.off('event', listener)
}
