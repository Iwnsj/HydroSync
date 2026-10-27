import { useEffect, useRef, useState } from 'react'
import { MOTION } from '../../config/motion'
import { useMotionEnabled } from '../../hooks/useMotionEnabled'
import { clamp } from '../../utils/format'
import { TONE } from '../../utils/status'

/**
 * Horizontal progress/level bar. Animates with transform: scaleX only.
 * `marker` draws a vertical threshold line (e.g. the 80% rain threshold).
 */
export default function ProgressBar({ value, max = 100, tone = 'brand', label, marker, markerLabel, height = 'h-3', className = '' }) {
  const ref = useRef(null)
  const enabled = useMotionEnabled()
  const [inView, setInView] = useState(!enabled)
  const [first, setFirst] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setInView(true)
      return undefined
    }
    const el = ref.current
    if (!el || inView) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        requestAnimationFrame(() => setInView(true))
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, inView])

  useEffect(() => {
    if (!inView) return undefined
    const t = setTimeout(() => setFirst(false), MOTION.progress.duration * 1000 + 100)
    return () => clearTimeout(t)
  }, [inView])

  const pct = clamp((value ?? 0) / max, 0, 1)
  const shownPct = !enabled || inView ? pct : 0
  const bar = (TONE[tone] ?? TONE.brand).bar
  const dur = first ? MOTION.progress.duration : MOTION.progress.updateDuration
  const ease = first ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value == null ? undefined : Math.round(value)}
      className={`relative w-full rounded-full bg-slate-200 dark:bg-slate-800 ${height} ${className}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div
          className={`absolute inset-0 origin-left ${bar}`}
          style={{
            transform: `scaleX(${shownPct})`,
            transition: enabled ? `transform ${dur}s ${ease}, background-color 0.5s ease` : 'none',
          }}
        />
      </div>
      {marker != null && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-slate-800 dark:bg-white"
          style={{
            left: `${clamp(marker / max, 0, 1) * 100}%`,
            transition: enabled ? 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
          title={markerLabel}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
