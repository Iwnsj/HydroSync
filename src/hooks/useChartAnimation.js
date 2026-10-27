import { useEffect, useState } from 'react'
import { MOTION } from '../config/motion'
import { useMotionEnabled } from './useMotionEnabled'

/**
 * Recharts animation props for the FIRST draw only. After the draw-in
 * finishes, animation is switched off so 2-second live updates don't
 * re-animate the whole line.
 */
export function useChartAnimation(duration = MOTION.chart.duration) {
  const enabled = useMotionEnabled()
  const [active, setActive] = useState(enabled)
  useEffect(() => {
    if (!enabled) {
      setActive(false)
      return undefined
    }
    const t = setTimeout(() => setActive(false), duration + 150)
    return () => clearTimeout(t)
  }, [enabled, duration])
  return { isAnimationActive: active, animationDuration: duration, animationEasing: MOTION.chart.easing }
}
