import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { prefersReducedMotion } from '../hooks'
import { createHeroScene } from './heroScene'

export const HeroCanvas = ({ sceneRef }) => {
  const { t, isRtl } = useI18n()
  const canvasRef = useRef(null)

  useEffect(() => {
    const scene = createHeroScene(canvasRef.current, { reducedMotion: prefersReducedMotion() })
    if (!scene) return undefined
    sceneRef.current = scene
    scene.start()
    return () => {
      scene.destroy()
      sceneRef.current = null
    }
  }, [sceneRef])

  useEffect(() => {
    sceneRef.current?.setMirror(isRtl)
  }, [isRtl, sceneRef])

  return <canvas ref={canvasRef} className="hero-canvas" role="img" aria-label={t('hero.visual')} />
}

export default HeroCanvas
