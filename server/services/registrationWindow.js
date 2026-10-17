import { RegistrationWindow } from '../models/RegistrationWindow.js'
import { readSettingsInput, resolveRegistration, toPublicWindow } from '../../shared/registrationWindow.js'

export { readSettingsInput, resolveRegistration, toPublicWindow }

export const loadRegistrationWindow = () => RegistrationWindow.findOne({ key: 'membership' }).lean()

export const saveRegistrationWindow = (data) =>
  RegistrationWindow.findOneAndUpdate(
    { key: 'membership' },
    {
      $set: {
        key: 'membership',
        countdownVisible: data.countdownVisible,
        timeZone: data.timeZone,
        opensAt: data.opensAt,
        closesAt: data.closesAt,
        override: data.override,
        messagePreset: data.messagePreset,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean()

export const windowAdminOnly = (req, res, next) => (req.actor?.role === 'admin' ? next() : res.status(403).json({ error: 'Forbidden' }))
