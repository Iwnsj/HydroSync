import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber'
import { StatusPill } from './Badge'
import { Skeleton } from './Skeleton'
import { MOTION } from '../../config/motion'
import { useMotionEnabled } from '../../hooks/useMotionEnabled'
import { clamp, fmtNum } from '../../utils/format'
import { TONE } from '../../utils/status'

const CX = 100
const CY = 100
const R = 80
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

/** Point on the semicircle for a fraction 0..1 (left → right). */
function pointAt(frac, radius) {
  const angle = Math.PI * (1 - frac)
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) }
}

/**
 * Semicircle gauge with the crop's target band drawn on the track.
 * Fill animates from empty on first view, then tweens on updates.
 * The target band and markers also tween when the crop/stage changes.
 */
export default function Gauge({ loading, label, ...rest }) {
  if (loading) {
    return (
      <div className="card p-4" role="status" aria-label={`Loading ${label}`}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mx-auto mt-4 h-20 w-full rounded-t-full" />
        <Skeleton className="mx-auto mt-3 h-3 w-24" />
      </div>
    )
  }
  return <GaugeBody label={label} {...rest} />
}

function GaugeBody({
  label,
  value,
  scaleMin = 0,
  scaleMax = 100,
  targetMin,
  targetMax,
  decimals = 0,
  suffix = '',
  status = 'neutral',
  statusLabel,
  sub,
  error,
  fault,
}) {
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
    const t = setTimeout(() => setFirst(false), MOTION.gauge.duration * 1000 + 100)
    return () => clearTimeout(t)
  }, [inView])

  const frac = (v) => clamp((v - scaleMin) / (scaleMax - scaleMin), 0, 1)
  const hasValue = typeof value === 'number' && Number.isFinite(value) && !fault && !error
  const tone = TONE[status] ?? TONE.neutral
  const tMin = frac(targetMin)
  const tMax = frac(targetMax)
  const bandLen = Math.max(0.001, tMax - tMin)
  const fillFrac = !enabled || inView ? Math.max(0.001, frac(value)) : 0
  const fillDuration = first ? MOTION.gauge.duration : MOTION.gauge.updateDuration
  const fillEase = first ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)'
  const markers = [tMin, tMax].map((f) => ({ a: pointAt(f, R - 13), b: pointAt(f, R + 13) }))

  return (
    <article
      ref={ref}
      className="card card-hover flex flex-col p-4"
      aria-label={`${label}: ${hasValue ? `${fmtNum(value, decimals)}${suffix}` : 'no reading'}, target ${fmtNum(targetMin, decimals)} to ${fmtNum(targetMax, decimals)}${suffix}, ${statusLabel ?? ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</h3>
        {hasValue ? (
          <StatusPill status={status} label={statusLabel} />
        ) : (
          <StatusPill status="bad" label={fault ? 'Sensor fault' : 'No data'} icon={AlertTriangle} />
        )}
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[220px]">
        <svg viewBox="0 0 200 112" className="w-full overflow-visible" aria-hidden="true">
          <path d={ARC} fill="none" strokeWidth="16" strokeLinecap="round" className="stroke-slate-200 dark:stroke-slate-800" />
          {/* target band */}
          <path
            d={ARC}
            pathLength="1"
            fill="none"
            stroke="#10b981"
            strokeOpacity="0.28"
            strokeWidth="16"
            strokeDasharray={`${bandLen} 1`}
            strokeDashoffset={-tMin}
            style={{
              transition: enabled ? 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            }}
          />
          {/* value fill */}
          {hasValue && (
            <path
              d={ARC}
              pathLength="1"
              fill="none"
              stroke={tone.stroke}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="1"
              strokeDashoffset={1 - fillFrac}
              style={{
                transition: enabled ? `stroke-dashoffset ${fillDuration}s ${fillEase}, stroke 0.4s ease` : 'none',
              }}
            />
          )}
          {/* target markers */}
          {markers.map((m, i) => (
            <line
              key={i}
              x1={m.a.x}
              y1={m.a.y}
              x2={m.b.x}
              y2={m.b.y}
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stroke-emerald-600 dark:stroke-emerald-400"
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold leading-none tracking-tight sm:text-[1.7rem]">
            {hasValue ? <AnimatedNumber value={value} decimals={decimals} suffix={suffix} /> : '—'}
          </span>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Target{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          <AnimatedNumber value={targetMin} decimals={decimals} />–<AnimatedNumber value={targetMax} decimals={decimals} suffix={suffix} suffixClassName="" />
        </span>
      </p>
      {sub && <p className="mt-0.5 text-center text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </article>
  )
}
