import { RefreshCw } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber'
import { StatusPill } from './Badge'
import { Skeleton } from './Skeleton'
import { TONE } from '../../utils/status'

/**
 * KPI card: icon, label, animated value, status pill and an optional sub-line.
 * Pass `valueNode` to render something other than a number (e.g. a time).
 */
export default function StatCard({
  label,
  icon: Icon,
  value,
  decimals = 0,
  suffix = '',
  valueNode,
  status,
  statusLabel,
  sub,
  footer,
  loading,
  error,
  onRetry,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`card p-4 ${className}`} role="status" aria-label={`Loading ${label}`}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-4 h-8 w-24" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`card flex flex-col justify-between p-4 ${className}`} role="alert">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">Unavailable</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        )}
      </div>
    )
  }

  const tone = TONE[status] ?? TONE.brand
  return (
    <article className={`card card-hover flex flex-col p-4 ${className}`} aria-label={label}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-500 ${tone.bg} ${tone.text}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <h3 className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">{label}</h3>
        </div>
      </div>
      <div className="mt-3 text-[1.75rem] font-bold leading-none tracking-tight sm:text-3xl">
        {valueNode ?? <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {status && <StatusPill status={status} label={statusLabel} />}
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </article>
  )
}
