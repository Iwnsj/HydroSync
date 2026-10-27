import { useEffect, useRef, useState } from 'react'
import { MOTION } from '../../config/motion'
import { useMotionEnabled } from '../../hooks/useMotionEnabled'
import { fmtNum } from '../../utils/format'

/** Quartic ease-out: fast start, gentle deceleration into the target value. */
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)
/** Smooth ease-out for live 2-second value updates. */
const easeStandard = (t) => 1 - Math.pow(1 - t, 2.5)

/**
 * Count-up number.
 *  • First time it scrolls into view: 0 → value with an ease-out (≈1.5 s).
 *  • Later value changes (live telemetry): previous → new in ≈0.5 s, never from 0.
 *  • Reduced motion / animations off: renders the final value immediately.
 *  • tabular-nums + a min-width sized to the final string = no layout jump.
 * The DOM text is updated directly on each rAF frame to avoid React re-renders.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = MOTION.countUp.duration,
  className = '',
  suffixClassName = 'ml-0.5 text-[0.55em] font-semibold text-slate-500 dark:text-slate-400',
  format,
}) {
  const wrapRef = useRef(null)
  const numRef = useRef(null)
  const enabled = useMotionEnabled()
  const [inView, setInView] = useState(false)
  const valid = typeof value === 'number' && Number.isFinite(value)
  const shown = useRef(enabled ? 0 : valid ? value : 0)
  const hasRun = useRef(false)
  const fmt = (v) => (format ? format(v) : fmtNum(v, decimals))

  useEffect(() => {
    const el = wrapRef.current
    if (!el || inView) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: MOTION.countUp.viewMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView])

  useEffect(() => {
    const node = numRef.current
    if (!valid || !node) return undefined
    if (!enabled) {
      shown.current = value
      node.textContent = fmt(value)
      return undefined
    }
    if (!inView) return undefined

    const first = !hasRun.current
    hasRun.current = true
    const from = first ? 0 : shown.current
    const to = value
    const durMs = (first ? duration : MOTION.countUp.updateDuration) * 1000
    const easeFn = first ? easeOutQuart : easeStandard

    if (durMs <= 0 || Math.abs(to - from) < 1e-6) {
      shown.current = to
      node.textContent = fmt(to)
      return undefined
    }

    let rafId = 0
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / durMs))
      const current = from + (to - from) * easeFn(t)
      shown.current = current
      node.textContent = fmt(current)
      if (t < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        shown.current = to
        node.textContent = fmt(to)
      }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, valid, inView, enabled, duration, decimals])

  const finalText = valid ? fmt(value) : '—'

  return (
    <span ref={wrapRef} className={`tabular whitespace-nowrap ${className}`}>
      <span className="sr-only">{valid ? `${prefix}${finalText}${suffix}` : 'No data'}</span>
      <span aria-hidden="true">
        {prefix}
        {valid ? (
          <span ref={numRef} className="inline-block text-right" style={{ minWidth: `${finalText.length}ch` }}>
            {fmt(shown.current)}
          </span>
        ) : (
          '—'
        )}
        {suffix && valid && <span className={suffixClassName}>{suffix}</span>}
      </span>
    </span>
  )
}
