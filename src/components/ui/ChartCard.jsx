import { LineChart as LineIcon } from 'lucide-react'
import { Skeleton } from './Skeleton'
import { EmptyState, ErrorState } from './States'

/**
 * Card wrapper for every chart, handling loading / error / empty states.
 * Children are only mounted once data is ready, so each chart's draw-in
 * animation plays when it actually appears.
 */
export default function ChartCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = 'No data for this period',
  emptyDescription,
  height = 260,
  footer,
  className = '',
  children,
}) {
  return (
    <section className={`card flex flex-col p-4 sm:p-5 ${className}`} aria-label={title}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="section-title leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div style={{ height }} className="relative w-full">
        {loading ? (
          <Skeleton className="h-full w-full rounded-xl" />
        ) : error ? (
          <ErrorState compact title="Chart unavailable" message={error} onRetry={onRetry} />
        ) : empty ? (
          <EmptyState compact icon={LineIcon} title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </div>
      {footer && !loading && !error && <div className="mt-3">{footer}</div>}
    </section>
  )
}
