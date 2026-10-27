import { AlertOctagon, AlertTriangle, CheckCircle2, CircleHelp, Info, XCircle } from 'lucide-react'

/**
 * Status helpers. Every status has a color, an icon AND a text label so
 * color is never the only indicator.
 */

/** Tailwind class bundles per tone. Written out in full so Tailwind's JIT picks them up. */
export const TONE = {
  ok: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-600/20 dark:ring-emerald-400/30',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    stroke: '#10b981',
  },
  warn: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-600/20 dark:ring-amber-400/30',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    stroke: '#f59e0b',
  },
  bad: {
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    ring: 'ring-rose-600/20 dark:ring-rose-400/30',
    border: 'border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    stroke: '#f43f5e',
  },
  info: {
    text: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    ring: 'ring-sky-600/20 dark:ring-sky-400/30',
    border: 'border-sky-200 dark:border-sky-500/30',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    stroke: '#0ea5e9',
  },
  brand: {
    text: 'text-brand-700 dark:text-brand-300',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
    ring: 'ring-brand-600/20 dark:ring-brand-400/30',
    border: 'border-brand-200 dark:border-brand-500/30',
    dot: 'bg-brand-500',
    bar: 'bg-brand-500',
    stroke: '#04c8a7',
  },
  neutral: {
    text: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    ring: 'ring-slate-500/20 dark:ring-slate-400/20',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    stroke: '#94a3b8',
  },
}

export const STATUS_ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  info: Info,
  neutral: CircleHelp,
  brand: CheckCircle2,
}

/**
 * Range status for a value with a target band:
 *  ok   = comfortably inside the band
 *  warn = inside, but within 10% of either edge ("near limit")
 *  bad  = outside the band
 */
export function rangeStatus(value, min, max, marginRatio = 0.1) {
  if (value == null || Number.isNaN(value)) return { status: 'neutral', label: 'No data' }
  const margin = Math.max((max - min) * marginRatio, 1e-6)
  if (value < min) return { status: 'bad', label: 'Too low' }
  if (value > max) return { status: 'bad', label: 'Too high' }
  if (value < min + margin) return { status: 'warn', label: 'Near min' }
  if (value > max - margin) return { status: 'warn', label: 'Near max' }
  return { status: 'ok', label: 'In range' }
}

/** Tank-style level where higher is better. */
export function levelStatus(level, low) {
  if (level == null) return { status: 'neutral', label: 'No data' }
  if (level < low) return { status: 'bad', label: 'Low' }
  if (level < low + 10) return { status: 'warn', label: 'Getting low' }
  return { status: 'ok', label: 'OK' }
}

export const SEVERITY = {
  info: { label: 'Info', tone: 'info', icon: Info },
  warning: { label: 'Warning', tone: 'warn', icon: AlertTriangle },
  critical: { label: 'Critical', tone: 'bad', icon: AlertOctagon },
}

/** System status derived from the connection block of a telemetry snapshot. */
export function systemStatus(connection) {
  if (!connection) return { id: 'unknown', label: 'Connecting…', tone: 'neutral' }
  if (connection.mode === 'local') return { id: 'local', label: 'Local Hotspot', tone: 'info' }
  if (connection.mode === 'offline' || !connection.internetUp) return { id: 'offline', label: 'Offline', tone: 'warn' }
  return { id: 'online', label: 'Online', tone: 'ok' }
}
