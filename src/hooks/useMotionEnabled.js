import { useReducedMotion } from 'framer-motion'
import { useSettingsStore } from '../store/settingsStore'

/** True when animations are allowed: Settings toggle ON and OS reduced-motion OFF. */
export function useMotionEnabled() {
  const reduced = useReducedMotion()
  const animations = useSettingsStore((s) => s.settings.animations)
  return animations && !reduced
}
