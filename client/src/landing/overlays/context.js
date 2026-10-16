import { createContext, useContext } from 'react'

export const OverlayContext = createContext({
  openTerminal: () => {},
  openRegistration: () => {},
})

export const useOverlay = () => useContext(OverlayContext)
